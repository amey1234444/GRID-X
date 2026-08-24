import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@gridx/db';
import {
  CreateMaterialIssueInput,
  MaterialTransactionType,
  Paginated,
  PaginationInput,
  RecordMaterialTransactionInput,
  TRANSACTION_TYPE_LABELS,
  round2,
  acknowledgeMaterialSchema,
  completeReconciliationSchema,
  materialRequirement,
  materialTransactionQuerySchema,
  recordScrapSchema,
  scrapVerdict,
  transactionDirection,
  updateConsumptionSchema,
} from '@gridx/shared';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SequenceService } from '../audit/sequence.service';
import { FilesService } from '../files/files.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RequestUser } from '../common/request-user';
import { paginate, paginationArgs } from '../common/pagination';
import { assertCompanyScope, companyWhere } from '../common/company-scope';
import { JobsService } from '../jobs/jobs.service';
import { ImsService } from '../ims/ims.service';
import { SettingsService } from '../common/settings.service';

export interface MaterialIssueFilters extends PaginationInput {
  jobId?: string;
  partnerId?: string;
  status?: string;
}

/**
 * Module 6 — material issue, custody and reconciliation. Material stays OSWAR's asset while it is
 * with a partner, so every kilogram is tracked from issue to consumption, scrap and return.
 */
@Injectable()
export class MaterialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sequence: SequenceService,
    private readonly files: FilesService,
    private readonly notifications: NotificationsService,
    private readonly jobs: JobsService,
    private readonly ims: ImsService,
    private readonly settings: SettingsService,
  ) {}

  /** Every job-scoped material write is checked for partner and company reach. */
  private async assertJobScope(actor: RequestUser, jobId: string): Promise<void> {
    const job = await this.prisma.gridJob.findUniqueOrThrow({
      where: { id: jobId },
      select: { companyId: true, partnerId: true },
    });
    if (actor.partnerId && job.partnerId !== actor.partnerId) {
      throw new ForbiddenException('This job is not assigned to you');
    }
    assertCompanyScope(actor, job.companyId, 'job');
  }

  async list(actor: RequestUser, filters: MaterialIssueFilters): Promise<Paginated<unknown>> {
    const where: Prisma.MaterialIssueWhereInput = {
      ...companyWhere(actor),
      ...(actor.partnerId ? { partnerId: actor.partnerId } : {}),
      ...(filters.jobId ? { jobId: filters.jobId } : {}),
      ...(filters.partnerId && !actor.partnerId ? { partnerId: filters.partnerId } : {}),
      ...(filters.status ? { status: filters.status as Prisma.EnumMaterialIssueStatusFilter } : {}),
      ...(filters.search
        ? { challanNumber: { contains: filters.search, mode: 'insensitive' } }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.materialIssue.findMany({
        where,
        ...paginationArgs(filters),
        orderBy: { createdAt: 'desc' },
        include: {
          job: { select: { id: true, jobNumber: true, componentId: true } },
          partner: { select: { id: true, businessName: true } },
          items: { include: { item: true } },
          acknowledgements: true,
        },
      }),
      this.prisma.materialIssue.count({ where }),
    ]);
    return paginate(data, total, filters);
  }

  /**
   * Materials - Partner stock (Section 24). What OSWAR material is sitting in partner workshops
   * right now, and against which job.
   *
   * The chairman dashboard already reports one total for material under partner custody, but a
   * total is not actionable: recovering it means knowing which partner holds what. Balance is
   * issued weight less what has been consumed and what has come back as scrap, per job and item.
   */
  async partnerStock(
    actor: RequestUser,
    filters: { partnerId?: string; companyId?: string },
  ): Promise<{
    rows: {
      partnerId: string;
      partnerName: string;
      jobId: string;
      jobNumber: string;
      jobStatus: string;
      itemId: string;
      itemCode: string;
      itemName: string;
      issuedKg: number;
      consumedKg: number;
      scrapReturnedKg: number;
      balanceKg: number;
      oldestIssueDate: Date | null;
      daysHeld: number | null;
    }[];
    totals: { issuedKg: number; balanceKg: number; partners: number };
  }> {
    const issueWhere: Prisma.MaterialIssueWhereInput = {
      ...companyWhere(actor, filters.companyId),
      ...(actor.partnerId ? { partnerId: actor.partnerId } : {}),
      ...(filters.partnerId && !actor.partnerId ? { partnerId: filters.partnerId } : {}),
      // Nothing is at the partner until it has actually gone out.
      status: { in: ['ISSUED', 'ACKNOWLEDGED'] },
    };

    const issues = await this.prisma.materialIssue.findMany({
      where: issueWhere,
      select: {
        issueDate: true,
        createdAt: true,
        partner: { select: { id: true, businessName: true } },
        job: { select: { id: true, jobNumber: true, status: true } },
        items: {
          select: {
            issueWeightKg: true,
            item: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    type Row = Awaited<ReturnType<MaterialsService['partnerStock']>>['rows'][number];
    const byKey = new Map<string, Row>();

    for (const issue of issues) {
      const issuedOn = issue.issueDate ?? issue.createdAt;
      for (const line of issue.items) {
        const key = `${issue.job.id}|${line.item.id}`;
        const existing = byKey.get(key);
        if (existing) {
          existing.issuedKg += line.issueWeightKg;
          if (existing.oldestIssueDate && issuedOn < existing.oldestIssueDate) {
            existing.oldestIssueDate = issuedOn;
          }
          continue;
        }
        byKey.set(key, {
          partnerId: issue.partner.id,
          partnerName: issue.partner.businessName,
          jobId: issue.job.id,
          jobNumber: issue.job.jobNumber,
          jobStatus: issue.job.status,
          itemId: line.item.id,
          itemCode: line.item.code,
          itemName: line.item.name,
          issuedKg: line.issueWeightKg,
          consumedKg: 0,
          scrapReturnedKg: 0,
          balanceKg: 0,
          oldestIssueDate: issuedOn,
          daysHeld: null,
        });
      }
    }

    const jobIds = [...new Set([...byKey.values()].map((row) => row.jobId))];
    if (jobIds.length > 0) {
      const [consumption, scrap] = await Promise.all([
        this.prisma.materialConsumption.groupBy({
          by: ['jobId', 'itemId'],
          where: { jobId: { in: jobIds } },
          _sum: { actualKg: true },
        }),
        this.prisma.scrapReturn.groupBy({
          by: ['jobId', 'itemId'],
          where: { jobId: { in: jobIds } },
          _sum: { returnedWeightKg: true },
        }),
      ]);

      for (const row of consumption) {
        const target = byKey.get(`${row.jobId}|${row.itemId}`);
        if (target) target.consumedKg = row._sum.actualKg ?? 0;
      }
      for (const row of scrap) {
        const target = byKey.get(`${row.jobId}|${row.itemId}`);
        if (target) target.scrapReturnedKg = row._sum.returnedWeightKg ?? 0;
      }
    }

    const now = Date.now();
    const rows = [...byKey.values()]
      .map((row) => ({
        ...row,
        balanceKg: round2(row.issuedKg - row.consumedKg - row.scrapReturnedKg),
        issuedKg: round2(row.issuedKg),
        consumedKg: round2(row.consumedKg),
        scrapReturnedKg: round2(row.scrapReturnedKg),
        daysHeld: row.oldestIssueDate
          ? Math.floor((now - row.oldestIssueDate.getTime()) / 86_400_000)
          : null,
      }))
      // Anything still out, heaviest first — that is what is worth chasing.
      .filter((row) => row.balanceKg > 0.01)
      .sort((a, b) => b.balanceKg - a.balanceKg);

    return {
      rows,
      totals: {
        issuedKg: round2(rows.reduce((sum, row) => sum + row.issuedKg, 0)),
        balanceKg: round2(rows.reduce((sum, row) => sum + row.balanceKg, 0)),
        partners: new Set(rows.map((row) => row.partnerId)).size,
      },
    };
  }

  /** Materials - Scrap (Section 24). The scrap register, which had no read path at all. */
  async listScrap(
    actor: RequestUser,
    filters: PaginationInput & { partnerId?: string; jobId?: string },
  ) {
    const where: Prisma.ScrapReturnWhereInput = {
      job: {
        ...companyWhere(actor),
        ...(actor.partnerId ? { partnerId: actor.partnerId } : {}),
        ...(filters.partnerId && !actor.partnerId ? { partnerId: filters.partnerId } : {}),
      },
      ...(filters.jobId ? { jobId: filters.jobId } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.scrapReturn.findMany({
        where,
        ...paginationArgs(filters),
        orderBy: { returnedAt: 'desc' },
        include: {
          item: { select: { code: true, name: true } },
          job: {
            select: {
              id: true,
              jobNumber: true,
              partner: { select: { id: true, businessName: true } },
            },
          },
        },
      }),
      this.prisma.scrapReturn.count({ where }),
    ]);

    const data = rows.map((row) => ({
      id: row.id,
      jobId: row.job.id,
      jobNumber: row.job.jobNumber,
      partnerName: row.job.partner?.businessName ?? null,
      itemCode: row.item.code,
      itemName: row.item.name,
      scrapWeightKg: row.scrapWeightKg,
      returnedWeightKg: row.returnedWeightKg,
      // What was generated but never came back is the figure that costs money.
      outstandingKg: round2(row.scrapWeightKg - row.returnedWeightKg),
      scrapPercent: row.scrapPercent,
      challanNumber: row.challanNumber,
      returnedAt: row.returnedAt,
    }));

    return paginate(data, total, filters);
  }

  async findOne(actor: RequestUser, id: string) {
    const issue = await this.prisma.materialIssue.findUniqueOrThrow({
      where: { id },
      include: {
        job: { include: { component: true } },
        partner: { select: { id: true, businessName: true, phone: true, city: true } },
        items: { include: { item: true } },
        acknowledgements: { include: { acknowledgedBy: { select: { id: true, name: true } } } },
      },
    });
    if (actor.partnerId && issue.partnerId !== actor.partnerId) {
      throw new ForbiddenException('This material challan belongs to another partner');
    }
    assertCompanyScope(actor, issue.companyId, 'material challan');
    const photographs = await this.files.photographsFor('MaterialIssue', id);
    return { ...issue, photographs };
  }

  /** Issue material against a job — the partner cannot start production before acknowledgement. */
  /**
   * Module 6 step 2 — "material requirement calculated".
   *
   * Nothing calculated it: the bill of material sat on the component and the stores user typed
   * weights in by hand, which is also why `MaterialIssueItem.theoreticalQuantity` was a column
   * nothing ever wrote. The requirement is the job quantity against the component's bill of
   * material, plus the component's scrap allowance, and it is what the issue form is prefilled from.
   */
  async requirementFor(actor: RequestUser, jobId: string) {
    const job = await this.prisma.gridJob.findUniqueOrThrow({
      where: { id: jobId },
      include: {
        component: {
          include: { items: { include: { item: true } } },
        },
      },
    });
    assertCompanyScope(actor, job.companyId, 'job');

    const lines = materialRequirement(
      job.component.items.map((line) => ({
        itemId: line.itemId,
        itemCode: line.item.code,
        itemName: line.item.name,
        uom: line.uom,
        quantityPerUnit: line.quantityPerUnit,
        unitWeightKg: line.item.unitWeightKg,
      })),
      job.quantity,
      job.component.scrapAllowancePercent,
    );

    // What has already gone out, so a second challan asks for the balance rather than the whole
    // requirement again.
    const issued = await this.prisma.materialIssueItem.groupBy({
      by: ['itemId'],
      where: { materialIssue: { jobId, status: { not: 'CANCELLED' } } },
      _sum: { quantity: true, issueWeightKg: true },
    });
    const issuedByItem = new Map(issued.map((row) => [row.itemId, row._sum.quantity ?? 0]));

    return {
      jobId: job.id,
      jobNumber: job.jobNumber,
      quantity: job.quantity,
      componentCode: job.component.componentCode,
      componentName: job.component.name,
      scrapAllowancePercent: job.component.scrapAllowancePercent,
      hasBillOfMaterial: lines.length > 0,
      lines: lines.map((line) => {
        const alreadyIssued = issuedByItem.get(line.itemId) ?? 0;
        return {
          ...line,
          alreadyIssued,
          outstanding: Math.max(0, Math.round((line.grossQuantity - alreadyIssued) * 1000) / 1000),
        };
      }),
    };
  }

  async create(actor: RequestUser, input: CreateMaterialIssueInput) {
    const job = await this.prisma.gridJob.findUniqueOrThrow({
      where: { id: input.jobId },
      include: {
        component: { include: { items: true } },
      },
    });
    assertCompanyScope(actor, job.companyId, 'job');
    if (!job.partnerId) throw new BadRequestException('Allocate the job to a partner first');
    if (job.materialResponsibility !== 'OSWAR_SUPPLIED') {
      throw new BadRequestException('This job is on partner-procured material');
    }
    if (!['ACCEPTED', 'MATERIAL_PENDING', 'MATERIAL_ISSUED', 'IN_PRODUCTION'].includes(job.status)) {
      throw new BadRequestException('Material can only be issued after the partner accepts the job');
    }

    const challanNumber = await this.sequence.next('CHALLAN');
    const totalIssueWeightKg = input.items.reduce((sum, item) => sum + item.issueWeightKg, 0);

    // The theoretical quantity behind each line, so "theoretical versus actual" has a figure that
    // came from the bill of material rather than from whoever filled in the form.
    const requirement = materialRequirement(
      job.component.items.map((line) => ({
        itemId: line.itemId,
        uom: line.uom,
        quantityPerUnit: line.quantityPerUnit,
      })),
      job.quantity,
      job.component.scrapAllowancePercent,
    );
    const theoreticalByItem = new Map(requirement.map((line) => [line.itemId, line.netQuantity]));

    const issue = await this.prisma.materialIssue.create({
      data: {
        challanNumber,
        companyId: job.companyId,
        jobId: job.id,
        partnerId: job.partnerId,
        status: 'ISSUED',
        issueDate: new Date(),
        expectedReturnDate: input.expectedReturnDate,
        totalIssueWeightKg,
        vehicleNumber: input.vehicleNumber,
        driverName: input.driverName,
        remarks: input.remarks,
        createdById: actor.id,
        items: {
          create: input.items.map((item) => ({
            ...item,
            theoreticalQuantity: item.theoreticalQuantity ?? theoreticalByItem.get(item.itemId),
          })),
        },
      },
      include: { items: true },
    });

    // Module 6 — the ledger entry for material leaving OSWAR's custody.
    await this.recordTransactions(
      issue.items.map((item) => ({
        type: 'ISSUED_TO_PARTNER' as const,
        jobId: job.id,
        itemId: item.itemId,
        quantityKg: item.issueWeightKg,
        partnerId: job.partnerId,
        materialIssueId: issue.id,
        batchNumber: item.batchNumber,
        heatNumber: item.heatNumber,
        reference: challanNumber,
        recordedById: actor.id,
      })),
    );
    await this.files.attachPhotographs(
      input.photographFileIds,
      'MaterialIssue',
      issue.id,
      'Material issue',
    );

    if (job.status === 'ACCEPTED' || job.status === 'MATERIAL_PENDING') {
      if (job.status === 'ACCEPTED') {
        await this.jobs.transition(actor, job.id, 'MATERIAL_PENDING', 'Material challan prepared');
      }
      await this.jobs.transition(actor, job.id, 'MATERIAL_ISSUED', `Challan ${challanNumber}`);
    }

    await this.notifications.notify({
      event: 'MATERIAL_READY_FOR_PICKUP',
      title: `Material issued for ${job.jobNumber}`,
      body: `Challan ${challanNumber} — ${totalIssueWeightKg} kg. Acknowledge receipt on arrival.`,
      link: `/partner/material/${issue.id}`,
      entityType: 'MaterialIssue',
      entityId: issue.id,
      partnerId: job.partnerId,
      channels: ['IN_APP', 'WHATSAPP'],
    });
    // The internal side of the same event: material has left OSWAR's custody and is now the
    // partner's responsibility until it is reconciled (Module 6).
    await this.notifications.notify({
      event: 'MATERIAL_ISSUED',
      title: `Challan ${challanNumber} issued for ${job.jobNumber}`,
      body: `${totalIssueWeightKg} kg issued against ${job.jobNumber}. Material stays on the books until reconciliation.`,
      link: `/app/materials/issues/${issue.id}`,
      entityType: 'MaterialIssue',
      entityId: issue.id,
      roleCodes: ['STORES_USER', 'FINANCE_USER'],
    });
    // §10 — material issued to partners is one of the facts GRID-X owes IMS.
    await this.ims.pushInBackground('material-issued', issue.id);
    await this.audit.record(actor, {
      action: 'MATERIAL_ISSUED',
      entityType: 'MaterialIssue',
      entityId: issue.id,
      companyId: job.companyId,
      after: { challanNumber, totalIssueWeightKg, jobId: job.id },
    });
    return issue;
  }

  /** Partner acknowledgement, offline-queue safe through clientRequestId. */
  async acknowledge(
    actor: RequestUser,
    id: string,
    input: z.infer<typeof acknowledgeMaterialSchema>,
  ) {
    const issue = await this.prisma.materialIssue.findUniqueOrThrow({
      where: { id },
      include: { job: true },
    });
    if (actor.partnerId && issue.partnerId !== actor.partnerId) {
      throw new ForbiddenException('This material challan belongs to another partner');
    }
    if (input.clientRequestId) {
      const existing = await this.prisma.materialReceiptAcknowledgement.findUnique({
        where: { clientRequestId: input.clientRequestId },
      });
      if (existing) return existing;
    }

    const acknowledgement = await this.prisma.materialReceiptAcknowledgement.create({
      data: {
        materialIssueId: id,
        acknowledgedById: actor.id,
        receivedWeightKg: input.receivedWeightKg,
        shortageWeightKg: input.shortageWeightKg,
        damageRemarks: input.damageRemarks,
        signatureName: input.signatureName,
        clientRequestId: input.clientRequestId,
      },
    });
    await this.prisma.materialIssue.update({
      where: { id },
      data: { status: 'ACKNOWLEDGED' },
    });
    // Module 6 asks for a photograph at receipt; where the phone offered a position, keeping it
    // is what makes that photograph evidence the material reached the partner's premises.
    await this.files.attachPhotographs(
      input.photographFileIds,
      'MaterialIssue',
      id,
      'Material receipt',
      { latitude: input.latitude, longitude: input.longitude },
    );

    await this.notifications.notify({
      event: 'MATERIAL_ACKNOWLEDGED',
      title: `Material acknowledged for ${issue.job.jobNumber}`,
      body: `${input.receivedWeightKg} kg received${
        input.shortageWeightKg > 0 ? `, shortage ${input.shortageWeightKg} kg` : ''
      }.`,
      link: `/control/materials/${id}`,
      entityType: 'MaterialIssue',
      entityId: id,
      roleCodes: ['STORES_USER', 'OPERATIONS_HEAD'],
    });
    await this.audit.record(actor, {
      action: 'MATERIAL_ACKNOWLEDGED',
      entityType: 'MaterialIssue',
      entityId: id,
      companyId: issue.companyId,
      after: {
        receivedWeightKg: input.receivedWeightKg,
        shortageWeightKg: input.shortageWeightKg,
      },
    });
    return acknowledgement;
  }

  async recordConsumption(
    actor: RequestUser,
    jobId: string,
    input: z.infer<typeof updateConsumptionSchema>,
  ) {
    await this.assertJobScope(actor, jobId);

    // Module 6's headline control is "theoretical versus actual consumption". The theoretical side
    // used to be typed in alongside the actual, which made the variance a comparison between a
    // measurement and a guess. It is now derived from the component's bill of material, and an
    // explicitly supplied figure is only honoured when the component has no bill to derive from.
    const derived = await this.theoreticalConsumptionKg(jobId, input.itemId);
    const theoreticalKg = derived ?? input.theoreticalKg;

    const variancePercent =
      theoreticalKg > 0 ? ((input.actualKg - theoreticalKg) / theoreticalKg) * 100 : 0;
    const consumption = await this.prisma.materialConsumption.create({
      data: {
        jobId,
        itemId: input.itemId,
        theoreticalKg,
        actualKg: input.actualKg,
        variancePercent: Math.round(variancePercent * 100) / 100,
        remarks: input.remarks,
      },
    });

    await this.recordTransactions([
      {
        type: 'CONSUMED',
        jobId,
        itemId: input.itemId,
        quantityKg: input.actualKg,
        recordedById: actor.id,
        remarks: input.remarks,
      },
    ]);

    await this.audit.record(actor, {
      action: 'MATERIAL_CONSUMPTION_RECORDED',
      entityType: 'MaterialConsumption',
      entityId: consumption.id,
      after: {
        jobId,
        actualKg: input.actualKg,
        theoreticalKg,
        theoreticalSource: derived === null ? 'DECLARED' : 'BILL_OF_MATERIAL',
        variancePercent: consumption.variancePercent,
      },
    });
    return consumption;
  }

  /**
   * What the bill of material says this job should consume of an item, in kilograms.
   *
   * Null when the component carries no bill of material for the item — there is nothing to derive
   * from, and inventing a figure would be worse than accepting the one the user gave.
   */
  private async theoreticalConsumptionKg(
    jobId: string,
    itemId: string,
  ): Promise<number | null> {
    const job = await this.prisma.gridJob.findUniqueOrThrow({
      where: { id: jobId },
      select: {
        quantity: true,
        component: {
          select: {
            scrapAllowancePercent: true,
            items: {
              where: { itemId },
              select: { itemId: true, uom: true, quantityPerUnit: true, item: { select: { unitWeightKg: true } } },
            },
          },
        },
      },
    });
    const line = job.component.items[0];
    if (!line) return null;

    const [requirement] = materialRequirement(
      [
        {
          itemId: line.itemId,
          uom: line.uom,
          quantityPerUnit: line.quantityPerUnit,
          unitWeightKg: line.item.unitWeightKg,
        },
      ],
      job.quantity,
      job.component.scrapAllowancePercent,
    );
    // Consumption is measured against the net requirement: the scrap allowance is what is expected
    // to be lost, not what is expected to end up in the part.
    return requirement.grossWeightKg !== null
      ? Math.round((requirement.netQuantity * (line.item.unitWeightKg ?? 1)) * 1000) / 1000
      : requirement.netQuantity;
  }

  async recordScrap(actor: RequestUser, jobId: string, input: z.infer<typeof recordScrapSchema>) {
    await this.assertJobScope(actor, jobId);
    const issued = await this.issuedWeight(jobId, input.itemId);
    const scrapPercent = issued > 0 ? (input.scrapWeightKg / issued) * 100 : 0;
    const scrap = await this.prisma.scrapReturn.create({
      data: {
        jobId,
        itemId: input.itemId,
        scrapWeightKg: input.scrapWeightKg,
        returnedWeightKg: input.returnedWeightKg,
        scrapPercent: Math.round(scrapPercent * 100) / 100,
        challanNumber: input.challanNumber,
        remarks: input.remarks,
      },
    });
    await this.recordTransactions([
      {
        type: 'SCRAP_GENERATED',
        jobId,
        itemId: input.itemId,
        quantityKg: input.scrapWeightKg,
        recordedById: actor.id,
        reference: input.challanNumber,
      },
      ...(input.returnedWeightKg > 0
        ? [
            {
              type: 'SCRAP_RETURNED' as const,
              jobId,
              itemId: input.itemId,
              quantityKg: input.returnedWeightKg,
              recordedById: actor.id,
              reference: input.challanNumber,
            },
          ]
        : []),
    ]);

    // Module 6 — scrap beyond the component's allowance. `scrapAllowancePercent` was captured on
    // every component, imported, displayed, and compared against nothing, so a partner scrapping
    // 30% of a 5%-allowance part raised no flag and lost no money.
    const verdict = await this.assertScrapWithinAllowance(actor, jobId, issued, input.scrapWeightKg);

    await this.audit.record(actor, {
      action: 'SCRAP_RECORDED',
      entityType: 'ScrapReturn',
      entityId: scrap.id,
      after: {
        jobId,
        scrapWeightKg: input.scrapWeightKg,
        scrapPercent: scrap.scrapPercent,
        allowedPercent: verdict?.allowedPercent,
        excessPercent: verdict?.excessPercent,
      },
    });
    return { ...scrap, allowance: verdict };
  }

  /**
   * Compares actual scrap with the component's allowance and raises it where it is over.
   *
   * Deliberately a flag and an alert rather than a hard rejection: the scrap has physically already
   * happened, and refusing to record it would only push the number out of the system. The
   * reconciliation carries the excess through to a deduction.
   */
  private async assertScrapWithinAllowance(
    actor: RequestUser,
    jobId: string,
    issuedKg: number,
    scrapKg: number,
  ) {
    const enforce = await this.settings.get('materials.enforceScrapAllowance');
    if (!enforce) return null;

    const job = await this.prisma.gridJob.findUniqueOrThrow({
      where: { id: jobId },
      select: {
        jobNumber: true,
        partnerId: true,
        component: { select: { componentCode: true, scrapAllowancePercent: true } },
      },
    });
    const verdict = scrapVerdict(issuedKg, scrapKg, job.component.scrapAllowancePercent);
    if (verdict.withinAllowance) return verdict;

    await this.notifications.notify({
      event: 'JOB_DELAY_REPORTED',
      title: `Scrap above allowance on ${job.jobNumber}`,
      body:
        `${verdict.actualPercent}% scrap recorded against an allowance of ${verdict.allowedPercent}% ` +
        `on ${job.component.componentCode} — ${verdict.excessKg} kg over. This carries into ` +
        'material reconciliation as a deduction.',
      link: `/app/materials/reconciliation?jobId=${jobId}`,
      entityType: 'GridJob',
      entityId: jobId,
      roleCodes: ['STORES_USER', 'GRIDX_HEAD', 'FINANCE_USER'],
    });
    await this.audit.record(actor, {
      action: 'SCRAP_ALLOWANCE_EXCEEDED',
      entityType: 'GridJob',
      entityId: jobId,
      after: { ...verdict },
    });
    return verdict;
  }

  /** Reconciliation closes the material loop: issued = consumed + scrap + returned ± variance. */
  async reconcile(
    actor: RequestUser,
    jobId: string,
    input: z.infer<typeof completeReconciliationSchema>,
  ) {
    await this.assertJobScope(actor, jobId);
    const [job, item] = await Promise.all([
      this.prisma.gridJob.findUniqueOrThrow({
        where: { id: jobId },
        include: { component: { select: { componentCode: true, scrapAllowancePercent: true } } },
      }),
      this.prisma.item.findUniqueOrThrow({ where: { id: input.itemId } }),
    ]);
    const issuedKg = await this.issuedWeight(jobId, input.itemId);
    const consumption = await this.prisma.materialConsumption.aggregate({
      where: { jobId, itemId: input.itemId },
      _sum: { actualKg: true },
    });
    const scrap = await this.prisma.scrapReturn.aggregate({
      where: { jobId, itemId: input.itemId },
      _sum: { returnedWeightKg: true },
    });

    // Material that came back outside the scrap and unused flows — a rejected batch returned, or a
    // replacement issued — is part of the balance too, and before the ledger existed it had
    // nowhere to be counted.
    const ledger = await this.prisma.materialTransaction.groupBy({
      by: ['type'],
      where: {
        jobId,
        itemId: input.itemId,
        type: { in: ['REJECTED_MATERIAL', 'REPLACEMENT_MATERIAL', 'UNUSED_MATERIAL_RETURNED'] },
      },
      _sum: { quantityKg: true },
    });
    const ledgerSum = (type: MaterialTransactionType) =>
      ledger.find((row) => row.type === type)?._sum.quantityKg ?? 0;

    const rejectedReturnedKg = ledgerSum('REJECTED_MATERIAL');
    const replacementIssuedKg = ledgerSum('REPLACEMENT_MATERIAL');
    // A return already recorded on the ledger should not have to be typed in again; take whichever
    // is larger so the reconciliation form stays usable either way.
    const unusedReturnedKg = Math.max(input.unusedReturnedKg, ledgerSum('UNUSED_MATERIAL_RETURNED'));

    const totalIssuedKg = Math.round((issuedKg + replacementIssuedKg) * 1000) / 1000;
    const consumedKg = consumption._sum.actualKg ?? 0;
    const scrapReturnedKg = scrap._sum.returnedWeightKg ?? 0;
    const accounted = consumedKg + scrapReturnedKg + unusedReturnedKg + rejectedReturnedKg;
    const difference = Math.round((totalIssuedKg - accounted) * 1000) / 1000;

    // Weighbridge rounding should not raise a shortage deduction against a partner.
    const tolerance = await this.settings.get('materials.reconciliationToleranceKg');
    const withinTolerance = Math.abs(difference) <= tolerance;
    const shortageKg = !withinTolerance && difference > 0 ? difference : 0;
    const excessKg = !withinTolerance && difference < 0 ? Math.abs(difference) : 0;
    const status = shortageKg > 0 ? 'SHORTAGE' : excessKg > 0 ? 'EXCESS' : 'BALANCED';

    // Module 6 — scrap over the component's allowance is a real material loss and is deducted on
    // the same basis as a shortage.
    const scrapGenerated = await this.prisma.scrapReturn.aggregate({
      where: { jobId, itemId: input.itemId },
      _sum: { scrapWeightKg: true },
    });
    const enforceScrap = await this.settings.get('materials.enforceScrapAllowance');
    const scrapCheck = enforceScrap
      ? scrapVerdict(
          totalIssuedKg,
          scrapGenerated._sum.scrapWeightKg ?? 0,
          job.component.scrapAllowancePercent,
        )
      : null;
    const excessScrapKg = scrapCheck?.excessKg ?? 0;

    const rate = item.standardRate ?? 0;
    const deductionAmount =
      Math.round((shortageKg + excessScrapKg) * rate * 100) / 100;

    const reconciliation = await this.prisma.materialReconciliation.upsert({
      where: { jobId_itemId: { jobId, itemId: input.itemId } },
      create: {
        jobId,
        itemId: input.itemId,
        issuedKg: totalIssuedKg,
        consumedKg,
        scrapReturnedKg,
        unusedReturnedKg,
        shortageKg,
        excessKg,
        status,
        deductionAmount,
        reconciledById: actor.id,
        reconciledAt: new Date(),
        remarks: input.remarks,
      },
      update: {
        issuedKg: totalIssuedKg,
        consumedKg,
        scrapReturnedKg,
        unusedReturnedKg,
        shortageKg,
        excessKg,
        status,
        deductionAmount,
        reconciledById: actor.id,
        reconciledAt: new Date(),
        remarks: input.remarks,
      },
    });

    if (deductionAmount > 0 && job.partnerId) {
      const reasons = [
        shortageKg > 0 ? `shortage of ${shortageKg} kg` : null,
        excessScrapKg > 0
          ? `scrap ${scrapCheck?.excessPercent}% over the ${job.component.scrapAllowancePercent}% allowance (${excessScrapKg} kg)`
          : null,
      ].filter(Boolean);
      await this.prisma.partnerDeduction.create({
        data: {
          partnerId: job.partnerId,
          type: 'MATERIAL_SHORTAGE_DEDUCTION',
          amount: deductionAmount,
          reason: `Material ${reasons.join(' and ')} on ${job.jobNumber}`,
        },
      });
    }

    // A shortage is material that left OSWAR and never came back; recording it closes the ledger.
    if (shortageKg > 0) {
      await this.recordTransactions([
        {
          type: 'SHORTAGE',
          jobId,
          itemId: input.itemId,
          quantityKg: shortageKg,
          partnerId: job.partnerId,
          recordedById: actor.id,
          remarks: 'Raised on material reconciliation',
        },
      ]);
    }
    if (excessKg > 0) {
      await this.recordTransactions([
        {
          type: 'EXCESS',
          jobId,
          itemId: input.itemId,
          quantityKg: excessKg,
          partnerId: job.partnerId,
          recordedById: actor.id,
          remarks: 'Raised on material reconciliation',
        },
      ]);
    }

    await this.audit.record(actor, {
      action: 'MATERIAL_RECONCILED',
      entityType: 'MaterialReconciliation',
      entityId: reconciliation.id,
      companyId: job.companyId,
      after: {
        jobId,
        status,
        shortageKg,
        excessKg,
        excessScrapKg,
        deductionAmount,
        withinTolerance,
      },
    });
    return { ...reconciliation, scrapAllowance: scrapCheck };
  }

  async reconciliationSummary(actor: RequestUser, jobId: string) {
    await this.assertJobScope(actor, jobId);
    const [issues, consumption, scrap, reconciliations] = await Promise.all([
      this.prisma.materialIssueItem.findMany({
        where: { materialIssue: { jobId } },
        include: { item: true },
      }),
      this.prisma.materialConsumption.findMany({ where: { jobId } }),
      this.prisma.scrapReturn.findMany({ where: { jobId } }),
      this.prisma.materialReconciliation.findMany({ where: { jobId }, include: { item: true } }),
    ]);

    const byItem = new Map<
      string,
      { itemId: string; itemCode: string; itemName: string; issuedKg: number }
    >();
    for (const line of issues) {
      const current = byItem.get(line.itemId);
      byItem.set(line.itemId, {
        itemId: line.itemId,
        itemCode: line.item.code,
        itemName: line.item.name,
        issuedKg: (current?.issuedKg ?? 0) + line.issueWeightKg,
      });
    }

    return Array.from(byItem.values()).map((entry) => {
      const consumedKg = consumption
        .filter((row) => row.itemId === entry.itemId)
        .reduce((sum, row) => sum + row.actualKg, 0);
      const scrapReturnedKg = scrap
        .filter((row) => row.itemId === entry.itemId)
        .reduce((sum, row) => sum + row.returnedWeightKg, 0);
      const reconciliation = reconciliations.find((row) => row.itemId === entry.itemId) ?? null;
      return {
        ...entry,
        consumedKg,
        scrapReturnedKg,
        unusedReturnedKg: reconciliation?.unusedReturnedKg ?? 0,
        balanceKg:
          Math.round(
            (entry.issuedKg -
              consumedKg -
              scrapReturnedKg -
              (reconciliation?.unusedReturnedKg ?? 0)) *
              1000,
          ) / 1000,
        status: reconciliation?.status ?? 'PENDING',
        deductionAmount: reconciliation?.deductionAmount ?? 0,
      };
    });
  }

  /**
   * Writes ledger rows for movements the documented flows produce.
   *
   * The direction comes from the transaction type rather than the caller, so the sign convention
   * cannot drift between the places that write to the ledger.
   */
  private async recordTransactions(
    entries: Array<{
      type: MaterialTransactionType;
      jobId: string;
      itemId: string;
      quantityKg: number;
      partnerId?: string | null;
      materialIssueId?: string | null;
      batchNumber?: string | null;
      heatNumber?: string | null;
      replacesTransactionId?: string | null;
      reference?: string | null;
      remarks?: string | null;
      recordedById?: string | null;
      occurredAt?: Date;
    }>,
  ): Promise<void> {
    if (entries.length === 0) return;
    await this.prisma.materialTransaction.createMany({
      data: entries.map((entry) => ({
        type: entry.type,
        jobId: entry.jobId,
        itemId: entry.itemId,
        quantityKg: entry.quantityKg,
        directionKg: transactionDirection(entry.type) * entry.quantityKg,
        partnerId: entry.partnerId ?? null,
        materialIssueId: entry.materialIssueId ?? null,
        batchNumber: entry.batchNumber ?? null,
        heatNumber: entry.heatNumber ?? null,
        replacesTransactionId: entry.replacesTransactionId ?? null,
        reference: entry.reference ?? null,
        remarks: entry.remarks ?? null,
        recordedById: entry.recordedById ?? null,
        occurredAt: entry.occurredAt ?? new Date(),
      })),
    });
  }

  /**
   * Module 6 — records a movement that the issue, consumption, scrap and reconciliation flows do
   * not produce: material rejected and sent back, replacement material issued against it, unused
   * material returned outside reconciliation, and shortages or excess found at the partner.
   *
   * These four transaction types were in the enum and nowhere else, so a rejected batch going back
   * to OSWAR simply could not be recorded and the partner's stock stayed overstated.
   */
  async recordTransaction(actor: RequestUser, input: RecordMaterialTransactionInput) {
    const job = await this.prisma.gridJob.findUniqueOrThrow({
      where: { id: input.jobId },
      select: { id: true, jobNumber: true, companyId: true, partnerId: true },
    });
    assertCompanyScope(actor, job.companyId, 'job');

    const item = await this.prisma.item.findUniqueOrThrow({
      where: { id: input.itemId },
      select: { id: true, code: true, name: true },
    });

    if (input.replacesTransactionId) {
      const replaced = await this.prisma.materialTransaction.findUniqueOrThrow({
        where: { id: input.replacesTransactionId },
        select: { id: true, jobId: true, type: true },
      });
      if (replaced.jobId !== job.id) {
        throw new BadRequestException('The replaced movement belongs to a different job');
      }
      if (replaced.type !== 'REJECTED_MATERIAL') {
        throw new BadRequestException('Replacement material can only stand against rejected material');
      }
    }

    // Nothing can come back that never went out. Without this the ledger would happily record a
    // partner returning more than they ever held.
    if (transactionDirection(input.type) < 0) {
      const held = await this.partnerHoldingKg(job.id, item.id);
      if (input.quantityKg > held + 0.001) {
        throw new BadRequestException(
          `The partner holds ${held.toFixed(2)} kg of ${item.code} against ${job.jobNumber}; ` +
            `${input.quantityKg.toFixed(2)} kg cannot be returned.`,
        );
      }
    }

    const transaction = await this.prisma.materialTransaction.create({
      data: {
        type: input.type,
        jobId: job.id,
        itemId: item.id,
        quantityKg: input.quantityKg,
        directionKg: transactionDirection(input.type) * input.quantityKg,
        partnerId: job.partnerId,
        materialIssueId: input.materialIssueId ?? null,
        batchNumber: input.batchNumber ?? null,
        heatNumber: input.heatNumber ?? null,
        replacesTransactionId: input.replacesTransactionId ?? null,
        reference: input.reference ?? null,
        remarks: input.remarks ?? null,
        recordedById: actor.id,
        occurredAt: input.occurredAt ?? new Date(),
      },
    });

    await this.files.attachPhotographs(
      input.photographFileIds,
      'MaterialTransaction',
      transaction.id,
      TRANSACTION_TYPE_LABELS[input.type],
    );

    await this.audit.record(actor, {
      action: `MATERIAL_${input.type}`,
      entityType: 'MaterialTransaction',
      entityId: transaction.id,
      companyId: job.companyId,
      after: {
        jobId: job.id,
        itemCode: item.code,
        quantityKg: input.quantityKg,
        type: input.type,
      },
    });

    if (job.partnerId && (input.type === 'REJECTED_MATERIAL' || input.type === 'REPLACEMENT_MATERIAL')) {
      await this.notifications.notify({
        event: input.type === 'REJECTED_MATERIAL' ? 'MATERIAL_ISSUED' : 'MATERIAL_READY_FOR_PICKUP',
        title: `${TRANSACTION_TYPE_LABELS[input.type]} — ${job.jobNumber}`,
        body: `${input.quantityKg} kg of ${item.name} recorded against ${job.jobNumber}.`,
        link: `/partner/material`,
        entityType: 'MaterialTransaction',
        entityId: transaction.id,
        partnerId: job.partnerId,
      });
    }

    return transaction;
  }

  /** The material ledger for a job or partner (Module 6). */
  async listTransactions(
    actor: RequestUser,
    filters: z.infer<typeof materialTransactionQuerySchema>,
  ) {
    const where: Prisma.MaterialTransactionWhereInput = {
      job: companyWhere(actor),
      ...(filters.jobId ? { jobId: filters.jobId } : {}),
      ...(filters.partnerId ? { partnerId: filters.partnerId } : {}),
      ...(filters.itemId ? { itemId: filters.itemId } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.from || filters.to
        ? { occurredAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } }
        : {}),
    };
    return this.prisma.materialTransaction.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: 500,
      include: {
        item: { select: { code: true, name: true, uom: true } },
        job: { select: { jobNumber: true } },
        partner: { select: { partnerCode: true, businessName: true } },
        recordedBy: { select: { name: true } },
      },
    });
  }

  /** Net weight of one item still in the partner's hands for a job, from the ledger. */
  private async partnerHoldingKg(jobId: string, itemId: string): Promise<number> {
    const result = await this.prisma.materialTransaction.aggregate({
      where: { jobId, itemId },
      _sum: { directionKg: true },
    });
    return Math.max(0, result._sum.directionKg ?? 0);
  }

  private async issuedWeight(jobId: string, itemId: string): Promise<number> {
    const aggregate = await this.prisma.materialIssueItem.aggregate({
      where: { materialIssue: { jobId, status: { notIn: ['CANCELLED', 'DRAFT'] } }, itemId },
      _sum: { issueWeightKg: true },
    });
    return aggregate._sum.issueWeightKg ?? 0;
  }
}
