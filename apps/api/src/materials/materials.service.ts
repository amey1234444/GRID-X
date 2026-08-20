import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@gridx/db';
import {
  CreateMaterialIssueInput,
  Paginated,
  PaginationInput,
  acknowledgeMaterialSchema,
  completeReconciliationSchema,
  recordScrapSchema,
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
  async create(actor: RequestUser, input: CreateMaterialIssueInput) {
    const job = await this.prisma.gridJob.findUniqueOrThrow({
      where: { id: input.jobId },
      include: { component: true },
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
        items: { create: input.items },
      },
      include: { items: true },
    });
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
    await this.files.attachPhotographs(
      input.photographFileIds,
      'MaterialIssue',
      id,
      'Material receipt',
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
    const variancePercent =
      input.theoreticalKg > 0
        ? ((input.actualKg - input.theoreticalKg) / input.theoreticalKg) * 100
        : 0;
    const consumption = await this.prisma.materialConsumption.create({
      data: {
        jobId,
        itemId: input.itemId,
        theoreticalKg: input.theoreticalKg,
        actualKg: input.actualKg,
        variancePercent: Math.round(variancePercent * 100) / 100,
        remarks: input.remarks,
      },
    });
    await this.audit.record(actor, {
      action: 'MATERIAL_CONSUMPTION_RECORDED',
      entityType: 'MaterialConsumption',
      entityId: consumption.id,
      after: { jobId, actualKg: input.actualKg, variancePercent: consumption.variancePercent },
    });
    return consumption;
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
    await this.audit.record(actor, {
      action: 'SCRAP_RECORDED',
      entityType: 'ScrapReturn',
      entityId: scrap.id,
      after: { jobId, scrapWeightKg: input.scrapWeightKg, scrapPercent: scrap.scrapPercent },
    });
    return scrap;
  }

  /** Reconciliation closes the material loop: issued = consumed + scrap + returned ± variance. */
  async reconcile(
    actor: RequestUser,
    jobId: string,
    input: z.infer<typeof completeReconciliationSchema>,
  ) {
    await this.assertJobScope(actor, jobId);
    const [job, item] = await Promise.all([
      this.prisma.gridJob.findUniqueOrThrow({ where: { id: jobId } }),
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

    const consumedKg = consumption._sum.actualKg ?? 0;
    const scrapReturnedKg = scrap._sum.returnedWeightKg ?? 0;
    const accounted = consumedKg + scrapReturnedKg + input.unusedReturnedKg;
    const difference = Math.round((issuedKg - accounted) * 1000) / 1000;
    const shortageKg = difference > 0 ? difference : 0;
    const excessKg = difference < 0 ? Math.abs(difference) : 0;
    const status = shortageKg > 0 ? 'SHORTAGE' : excessKg > 0 ? 'EXCESS' : 'BALANCED';
    const deductionAmount = shortageKg * (item.standardRate ?? 0);

    const reconciliation = await this.prisma.materialReconciliation.upsert({
      where: { jobId_itemId: { jobId, itemId: input.itemId } },
      create: {
        jobId,
        itemId: input.itemId,
        issuedKg,
        consumedKg,
        scrapReturnedKg,
        unusedReturnedKg: input.unusedReturnedKg,
        shortageKg,
        excessKg,
        status,
        deductionAmount,
        reconciledById: actor.id,
        reconciledAt: new Date(),
        remarks: input.remarks,
      },
      update: {
        issuedKg,
        consumedKg,
        scrapReturnedKg,
        unusedReturnedKg: input.unusedReturnedKg,
        shortageKg,
        excessKg,
        status,
        deductionAmount,
        reconciledById: actor.id,
        reconciledAt: new Date(),
        remarks: input.remarks,
      },
    });

    if (shortageKg > 0 && job.partnerId) {
      await this.prisma.partnerDeduction.create({
        data: {
          partnerId: job.partnerId,
          type: 'MATERIAL_SHORTAGE_DEDUCTION',
          amount: deductionAmount,
          reason: `Material shortage of ${shortageKg} kg on ${job.jobNumber}`,
        },
      });
    }

    await this.audit.record(actor, {
      action: 'MATERIAL_RECONCILED',
      entityType: 'MaterialReconciliation',
      entityId: reconciliation.id,
      companyId: job.companyId,
      after: { jobId, status, shortageKg, excessKg, deductionAmount },
    });
    return reconciliation;
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

  private async issuedWeight(jobId: string, itemId: string): Promise<number> {
    const aggregate = await this.prisma.materialIssueItem.aggregate({
      where: { materialIssue: { jobId, status: { notIn: ['CANCELLED', 'DRAFT'] } }, itemId },
      _sum: { issueWeightKg: true },
    });
    return aggregate._sum.issueWeightKg ?? 0;
  }
}
