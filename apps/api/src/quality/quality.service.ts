import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@gridx/db';
import {
  CompleteInspectionInput,
  Paginated,
  PaginationInput,
  advanceCorrectiveActionSchema,
  assignInspectionSchema,
  createCorrectiveActionSchema,
  createInspectionPlanSchema,
  createReworkSchema,
  decideDeviationSchema,
  inspectionCharacteristicSchema,
  requestInspectionSchema,
  saveInspectionResultsSchema,
  updateReworkStatusSchema,
} from '@gridx/shared';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SequenceService } from '../audit/sequence.service';
import { FilesService } from '../files/files.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RequestUser } from '../common/request-user';
import { paginate, paginationArgs } from '../common/pagination';
import {
  allowedCompanyIds,
  assertCanWriteToCompany,
  assertCompanyScope,
  companyWhere,
  nestedCompanyWhere,
} from '../common/company-scope';
import { JobsService } from '../jobs/jobs.service';
import { ImsService } from '../ims/ims.service';

export interface InspectionFilters extends PaginationInput {
  status?: string;
  type?: string;
  jobId?: string;
  partnerId?: string;
  inspectorId?: string;
}

/**
 * Module 8 — inspection, non-conformance, rework and corrective action.
 * Inspection is the gate between production and payment: only accepted quantity becomes payable.
 */
@Injectable()
export class QualityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sequence: SequenceService,
    private readonly files: FilesService,
    private readonly notifications: NotificationsService,
    private readonly jobs: JobsService,
    private readonly ims: ImsService,
  ) {}

  /** Guards a job reached by id: partner isolation first, then company reach (Section 4 and 18). */
  private async assertJobScope(actor: RequestUser, jobId: string): Promise<void> {
    const job = await this.prisma.gridJob.findUniqueOrThrow({
      where: { id: jobId },
      select: { companyId: true, partnerId: true },
    });
    if (actor.partnerId && job.partnerId !== actor.partnerId) {
      throw new ForbiddenException('This job belongs to another partner');
    }
    assertCompanyScope(actor, job.companyId, 'job');
  }

  /** Same guard, reached through an inspection. */
  private async assertInspectionScope(actor: RequestUser, inspectionId: string): Promise<void> {
    const inspection = await this.prisma.inspection.findUniqueOrThrow({
      where: { id: inspectionId },
      select: { partnerId: true, job: { select: { companyId: true } } },
    });
    if (actor.partnerId && inspection.partnerId !== actor.partnerId) {
      throw new ForbiddenException('This inspection belongs to another partner');
    }
    assertCompanyScope(actor, inspection.job.companyId, 'inspection');
  }

  // -------------------------------------------------------------------------
  // Inspection plans
  // -------------------------------------------------------------------------

  async listPlans(actor: RequestUser, componentId?: string) {
    return this.prisma.inspectionPlan.findMany({
      where: { ...companyWhere(actor), ...(componentId ? { componentId } : {}), isActive: true },
      include: {
        characteristics: { orderBy: { sequence: 'asc' } },
        component: { select: { id: true, componentCode: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPlan(actor: RequestUser, input: z.infer<typeof createInspectionPlanSchema>) {
    assertCanWriteToCompany(actor, input.companyId);
    const plan = await this.prisma.inspectionPlan.create({
      data: {
        companyId: input.companyId,
        componentId: input.componentId,
        name: input.name,
        inspectionType: input.inspectionType,
        samplingPlan: input.samplingPlan,
        characteristics: { create: input.characteristics },
      },
      include: { characteristics: true },
    });
    await this.audit.record(actor, {
      action: 'INSPECTION_PLAN_CREATED',
      entityType: 'InspectionPlan',
      entityId: plan.id,
      companyId: input.companyId,
      after: { name: plan.name, characteristics: plan.characteristics.length },
    });
    return plan;
  }

  /** Appends a characteristic to an existing plan so plans can grow over time. */
  async addPlanCharacteristic(
    actor: RequestUser,
    planId: string,
    input: z.infer<typeof inspectionCharacteristicSchema>,
  ) {
    const plan = await this.prisma.inspectionPlan.findUniqueOrThrow({ where: { id: planId } });
    assertCompanyScope(actor, plan.companyId, 'inspection plan');
    const last = await this.prisma.inspectionCharacteristic.findFirst({
      where: { inspectionPlanId: planId },
      orderBy: { sequence: 'desc' },
      select: { sequence: true },
    });
    const characteristic = await this.prisma.inspectionCharacteristic.create({
      data: {
        ...input,
        sequence: input.sequence > 1 ? input.sequence : (last?.sequence ?? 0) + 1,
        inspectionPlanId: planId,
      },
    });
    await this.audit.record(actor, {
      action: 'INSPECTION_CHARACTERISTIC_ADDED',
      entityType: 'InspectionPlan',
      entityId: planId,
      companyId: plan.companyId,
      after: { characteristic: characteristic.characteristic },
    });
    return characteristic;
  }

  async removePlanCharacteristic(actor: RequestUser, characteristicId: string) {
    const characteristic = await this.prisma.inspectionCharacteristic.findUniqueOrThrow({
      where: { id: characteristicId },
      include: { inspectionPlan: { select: { companyId: true } } },
    });
    assertCompanyScope(actor, characteristic.inspectionPlan.companyId, 'inspection plan');
    const remaining = await this.prisma.inspectionCharacteristic.count({
      where: { inspectionPlanId: characteristic.inspectionPlanId },
    });
    if (remaining <= 1) {
      throw new BadRequestException('A plan must keep at least one characteristic');
    }
    await this.prisma.inspectionCharacteristic.delete({ where: { id: characteristicId } });
    await this.audit.record(actor, {
      action: 'INSPECTION_CHARACTERISTIC_REMOVED',
      entityType: 'InspectionPlan',
      entityId: characteristic.inspectionPlanId,
      before: { characteristic: characteristic.characteristic },
    });
    return { id: characteristicId, removed: true };
  }

  // -------------------------------------------------------------------------
  // Inspections
  // -------------------------------------------------------------------------

  async list(actor: RequestUser, filters: InspectionFilters): Promise<Paginated<unknown>> {
    const where: Prisma.InspectionWhereInput = {
      ...nestedCompanyWhere(actor, 'job'),
      ...(actor.partnerId ? { partnerId: actor.partnerId } : {}),
      ...(filters.partnerId && !actor.partnerId ? { partnerId: filters.partnerId } : {}),
      ...(filters.status ? { status: filters.status as Prisma.EnumInspectionStatusFilter } : {}),
      ...(filters.type ? { type: filters.type as Prisma.EnumInspectionTypeFilter } : {}),
      ...(filters.jobId ? { jobId: filters.jobId } : {}),
      ...(filters.inspectorId ? { inspectorId: filters.inspectorId } : {}),
      ...(filters.search
        ? {
            OR: [
              { inspectionNumber: { contains: filters.search, mode: 'insensitive' } },
              { job: { jobNumber: { contains: filters.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.inspection.findMany({
        where,
        ...paginationArgs(filters),
        orderBy: [{ requestedAt: 'desc' }],
        include: {
          job: { select: { id: true, jobNumber: true, quantity: true, component: true } },
          partner: { select: { id: true, businessName: true, city: true } },
          inspector: { select: { id: true, name: true } },
        },
      }),
      this.prisma.inspection.count({ where }),
    ]);
    return paginate(data, total, filters);
  }

  async findOne(actor: RequestUser, id: string) {
    const inspection = await this.prisma.inspection.findUniqueOrThrow({
      where: { id },
      include: {
        job: { include: { component: true, drawingRevision: true } },
        partner: { select: { id: true, businessName: true, city: true, phone: true } },
        inspectionPlan: { include: { characteristics: { orderBy: { sequence: 'asc' } } } },
        results: { orderBy: { recordedAt: 'asc' } },
        nonConformances: { include: { correctiveActions: true } },
        reworkOrders: true,
        deviations: true,
        inspector: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, name: true } },
      },
    });
    if (actor.partnerId && inspection.partnerId !== actor.partnerId) {
      throw new ForbiddenException('This inspection belongs to another partner');
    }
    assertCompanyScope(actor, inspection.job.companyId, 'inspection');
    const photographs = await this.files.photographsFor('Inspection', id);
    return { ...inspection, photographs };
  }

  /** Partner (or OSWAR planner) offers a batch for inspection. */
  async request(actor: RequestUser, input: z.infer<typeof requestInspectionSchema>) {
    const job = await this.prisma.gridJob.findUniqueOrThrow({
      where: { id: input.jobId },
      include: { component: true },
    });
    if (actor.partnerId && job.partnerId !== actor.partnerId) {
      throw new ForbiddenException('This job belongs to another partner');
    }
    assertCompanyScope(actor, job.companyId, 'job');
    if (input.offeredQuantity > job.quantity) {
      throw new BadRequestException('Offered quantity cannot exceed the job quantity');
    }

    const inspectionNumber = await this.sequence.next('INSPECTION');
    const inspection = await this.prisma.inspection.create({
      data: {
        inspectionNumber,
        jobId: job.id,
        partnerId: job.partnerId,
        inspectionPlanId: input.inspectionPlanId ?? job.inspectionPlanId,
        type: input.type,
        status: 'REQUESTED',
        offeredQuantity: input.offeredQuantity,
        requestedById: actor.id,
        remarks: input.remarks,
      },
    });
    await this.files.attachPhotographs(
      input.photographFileIds,
      'Inspection',
      inspection.id,
      'Inspection request',
    );

    if (job.status === 'IN_PRODUCTION' || job.status === 'MATERIAL_ISSUED') {
      await this.jobs.transition(
        actor,
        job.id,
        'INSPECTION_REQUESTED',
        `Inspection ${inspectionNumber} requested`,
      );
    }

    await this.notifications.notify({
      event: 'INSPECTION_REQUESTED',
      title: `Inspection requested for ${job.jobNumber}`,
      body: `${input.offeredQuantity} nos of ${job.component.name} offered for ${input.type.toLowerCase()} inspection.`,
      link: `/control/quality/${inspection.id}`,
      entityType: 'Inspection',
      entityId: inspection.id,
      roleCodes: ['QUALITY_INSPECTOR', 'OPERATIONS_HEAD'],
    });
    await this.audit.record(actor, {
      action: 'INSPECTION_REQUESTED',
      entityType: 'Inspection',
      entityId: inspection.id,
      companyId: job.companyId,
      after: { inspectionNumber, jobId: job.id, offeredQuantity: input.offeredQuantity },
    });
    return inspection;
  }

  async assign(actor: RequestUser, id: string, input: z.infer<typeof assignInspectionSchema>) {
    await this.assertInspectionScope(actor, id);
    const inspection = await this.prisma.inspection.update({
      where: { id },
      data: { inspectorId: input.inspectorId, dueAt: input.dueAt, status: 'ASSIGNED' },
      include: { job: { select: { jobNumber: true } } },
    });
    await this.notifications.notify({
      event: 'INSPECTION_REQUESTED',
      title: `Inspection assigned: ${inspection.inspectionNumber}`,
      body: `You are assigned to inspect ${inspection.job.jobNumber}.`,
      link: `/inspector/inspections/${id}`,
      entityType: 'Inspection',
      entityId: id,
      userIds: [input.inspectorId],
    });
    await this.audit.record(actor, {
      action: 'INSPECTION_ASSIGNED',
      entityType: 'Inspection',
      entityId: id,
      after: { inspectorId: input.inspectorId, dueAt: input.dueAt },
    });
    return inspection;
  }

  async start(actor: RequestUser, id: string) {
    await this.assertInspectionScope(actor, id);
    return this.prisma.inspection.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        inspectorId: actor.partnerId ? undefined : actor.id,
      },
    });
  }

  /** Record measured characteristics — the inspection record is the quality evidence. */
  async saveResults(
    actor: RequestUser,
    id: string,
    input: z.infer<typeof saveInspectionResultsSchema>,
  ) {
    await this.assertInspectionScope(actor, id);
    const inspection = await this.prisma.inspection.findUniqueOrThrow({ where: { id } });
    if (inspection.status === 'COMPLETED' || inspection.status === 'CANCELLED') {
      throw new BadRequestException('This inspection is already closed');
    }
    await this.prisma.inspectionResult.createMany({
      data: input.results.map((result) => ({ ...result, inspectionId: id })),
    });
    await this.files.attachPhotographs(
      input.photographFileIds,
      'Inspection',
      id,
      'Inspection measurement',
    );
    const updated = await this.prisma.inspection.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: inspection.startedAt ?? new Date(),
        inspectedQuantity: input.inspectedQuantity ?? inspection.inspectedQuantity,
      },
      include: { results: true },
    });
    await this.audit.record(actor, {
      action: 'INSPECTION_RESULTS_RECORDED',
      entityType: 'Inspection',
      entityId: id,
      after: { results: input.results.length },
    });
    return updated;
  }

  /**
   * Complete the inspection. Accepted quantity drives payment, rejection and rework raise a
   * non-conformance with a corrective action, and deviations need an explicit approval record.
   */
  async complete(actor: RequestUser, id: string, input: CompleteInspectionInput) {
    const inspection = await this.prisma.inspection.findUniqueOrThrow({
      where: { id },
      include: { job: { include: { component: true } } },
    });
    assertCompanyScope(actor, inspection.job.companyId, 'inspection');
    if (inspection.status === 'COMPLETED') {
      throw new BadRequestException('This inspection is already completed');
    }
    const disposition = input.acceptedQuantity + input.rejectedQuantity + input.reworkQuantity;
    if (disposition <= 0) {
      throw new BadRequestException('Record the accepted, rejected or rework quantity');
    }
    if (disposition > inspection.offeredQuantity) {
      throw new BadRequestException('Disposition cannot exceed the offered quantity');
    }

    const job = inspection.job;
    const completed = await this.prisma.inspection.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        decision: input.decision,
        acceptedQuantity: input.acceptedQuantity,
        rejectedQuantity: input.rejectedQuantity,
        reworkQuantity: input.reworkQuantity,
        inspectedQuantity: disposition,
        completedAt: new Date(),
        inspectorId: inspection.inspectorId ?? (actor.partnerId ? undefined : actor.id),
        remarks: input.remarks,
      },
    });
    await this.files.attachPhotographs(
      input.photographFileIds,
      'Inspection',
      id,
      'Inspection evidence',
    );

    let nonConformanceId: string | null = null;
    if (input.defectType && (input.rejectedQuantity > 0 || input.reworkQuantity > 0)) {
      const ncNumber = await this.sequence.next('NC');
      const nc = await this.prisma.nonConformance.create({
        data: {
          ncNumber,
          jobId: job.id,
          inspectionId: id,
          partnerId: job.partnerId,
          defectType: input.defectType,
          quantityAffected: input.rejectedQuantity + input.reworkQuantity,
          probableCause: input.probableCause,
          responsibility: input.responsibility ?? 'PARTNER',
          reworkCost: input.reworkCost ?? 0,
          materialLoss: input.materialLoss ?? 0,
          customerImpact: input.customerImpact,
          raisedById: actor.id,
        },
      });
      nonConformanceId = nc.id;
      const caNumber = await this.sequence.next('CA');
      await this.prisma.correctiveAction.create({
        data: { caNumber, nonConformanceId: nc.id, stage: 'ISSUE_RAISED' },
      });
    }

    if (input.reworkQuantity > 0 && input.reworkInstructions) {
      const reworkNumber = await this.sequence.next('REWORK');
      await this.prisma.reworkOrder.create({
        data: {
          reworkNumber,
          jobId: job.id,
          inspectionId: id,
          nonConformanceId,
          quantity: input.reworkQuantity,
          instructions: input.reworkInstructions,
          dueDate: input.reworkDueDate,
          estimatedCost: input.reworkCost ?? 0,
          chargeToPartner: (input.responsibility ?? 'PARTNER') === 'PARTNER',
          issuedById: actor.id,
        },
      });
    }

    if (input.decision === 'ACCEPTED_WITH_DEVIATION' && input.deviationNote) {
      await this.prisma.deviationApproval.create({
        data: { inspectionId: id, requestNote: input.deviationNote, status: 'REQUESTED' },
      });
    }

    const totals = await this.prisma.inspection.aggregate({
      where: { jobId: job.id, status: 'COMPLETED' },
      _sum: { acceptedQuantity: true, rejectedQuantity: true, reworkQuantity: true },
    });
    const acceptedQuantity = totals._sum.acceptedQuantity ?? 0;
    const rejectedQuantity = totals._sum.rejectedQuantity ?? 0;
    const reworkQuantity = totals._sum.reworkQuantity ?? 0;

    const nextStatus =
      input.reworkQuantity > 0
        ? 'REWORK'
        : acceptedQuantity >= job.quantity
          ? 'QUALITY_ACCEPTED'
          : job.status === 'UNDER_INSPECTION' || job.status === 'INSPECTION_REQUESTED'
            ? 'IN_PRODUCTION'
            : job.status;

    await this.jobs.transition(
      actor,
      job.id,
      nextStatus,
      `Inspection ${inspection.inspectionNumber}: ${input.decision}`,
      { acceptedQuantity, rejectedQuantity, reworkQuantity },
    );

    await this.notifications.notify({
      event: input.reworkQuantity > 0 ? 'REWORK_ISSUED' : 'INSPECTION_COMPLETED',
      title: `Inspection ${input.decision.replace(/_/g, ' ').toLowerCase()} — ${job.jobNumber}`,
      body: `Accepted ${input.acceptedQuantity}, rejected ${input.rejectedQuantity}, rework ${input.reworkQuantity}.`,
      link: `/partner/jobs/${job.id}`,
      entityType: 'Inspection',
      entityId: id,
      partnerId: job.partnerId ?? undefined,
      roleCodes: ['OPERATIONS_HEAD', 'QUALITY_INSPECTOR'],
      channels: ['IN_APP', 'WHATSAPP'],
    });

    // §10 — rejected quantities and finished components received are facts IMS needs to keep its
    // own stock and work-order picture straight.
    if (rejectedQuantity > 0) await this.ims.pushInBackground('rejected-quantities', job.id);
    if (nextStatus === 'QUALITY_ACCEPTED') {
      await this.ims.pushInBackground('finished-components-received', job.id);
    }
    await this.audit.record(actor, {
      action: 'INSPECTION_COMPLETED',
      entityType: 'Inspection',
      entityId: id,
      companyId: job.companyId,
      after: {
        decision: input.decision,
        acceptedQuantity: input.acceptedQuantity,
        rejectedQuantity: input.rejectedQuantity,
        reworkQuantity: input.reworkQuantity,
      },
    });
    return completed;
  }

  // -------------------------------------------------------------------------
  // Non-conformance, rework and corrective action
  // -------------------------------------------------------------------------

  async listNonConformances(actor: RequestUser, filters: PaginationInput & { jobId?: string }) {
    const where: Prisma.NonConformanceWhereInput = {
      ...nestedCompanyWhere(actor, 'job'),
      ...(actor.partnerId ? { partnerId: actor.partnerId } : {}),
      ...(filters.jobId ? { jobId: filters.jobId } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.nonConformance.findMany({
        where,
        ...paginationArgs(filters),
        orderBy: { raisedAt: 'desc' },
        include: {
          job: { select: { id: true, jobNumber: true } },
          partner: { select: { id: true, businessName: true } },
          correctiveActions: true,
          reworkOrders: true,
        },
      }),
      this.prisma.nonConformance.count({ where }),
    ]);
    return paginate(data, total, filters);
  }

  /**
   * The corrective-action queue (Section 24, Quality - Corrective Actions).
   *
   * A CAPA could be raised and advanced but never listed, so the only way to find an open one was
   * to already know which non-conformance it hung off. Module 8's workflow only means something if
   * somebody can see what is sitting at each stage.
   */
  async listCorrectiveActions(
    actor: RequestUser,
    filters: PaginationInput & { stage?: string; ownerId?: string; overdue?: boolean },
  ) {
    const where: Prisma.CorrectiveActionWhereInput = {
      nonConformance: {
        ...nestedCompanyWhere(actor, 'job'),
        ...(actor.partnerId ? { partnerId: actor.partnerId } : {}),
      },
      ...(filters.stage ? { stage: filters.stage as Prisma.EnumCorrectiveActionStageFilter } : {}),
      ...(filters.ownerId ? { ownerId: filters.ownerId } : {}),
      ...(filters.overdue ? { dueDate: { lt: new Date() }, closedAt: null } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.correctiveAction.findMany({
        where,
        ...paginationArgs(filters),
        // Open first, oldest first: the one that has been sitting longest needs attention most.
        orderBy: [{ closedAt: 'asc' }, { dueDate: 'asc' }],
        include: {
          owner: { select: { id: true, name: true } },
          nonConformance: {
            select: {
              id: true,
              ncNumber: true,
              defectType: true,
              quantityAffected: true,
              job: { select: { id: true, jobNumber: true } },
              partner: { select: { id: true, businessName: true } },
            },
          },
        },
      }),
      this.prisma.correctiveAction.count({ where }),
    ]);

    const now = Date.now();
    const data = rows.map((row) => ({
      id: row.id,
      caNumber: row.caNumber,
      stage: row.stage,
      dueDate: row.dueDate,
      closedAt: row.closedAt,
      createdAt: row.createdAt,
      ownerName: row.owner?.name ?? null,
      ncNumber: row.nonConformance.ncNumber,
      defectType: row.nonConformance.defectType,
      quantityAffected: row.nonConformance.quantityAffected,
      jobId: row.nonConformance.job?.id ?? null,
      jobNumber: row.nonConformance.job?.jobNumber ?? null,
      partnerName: row.nonConformance.partner?.businessName ?? null,
      overdueDays:
        row.closedAt === null && row.dueDate !== null && row.dueDate.getTime() < now
          ? Math.floor((now - row.dueDate.getTime()) / 86_400_000)
          : null,
    }));

    return paginate(data, total, filters);
  }

  /**
   * Deviations awaiting an engineering decision (Module 8).
   *
   * Accepting a component that misses its specification is now an engineering call, so engineering
   * needs somewhere to find the requests waiting on them.
   */
  async listDeviations(actor: RequestUser, filters: PaginationInput & { status?: string }) {
    const where: Prisma.DeviationApprovalWhereInput = {
      inspection: {
        job: {
          ...companyWhere(actor),
          ...(actor.partnerId ? { partnerId: actor.partnerId } : {}),
        },
      },
      ...(filters.status ? { status: filters.status as Prisma.EnumDeviationStatusFilter } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.deviationApproval.findMany({
        where,
        ...paginationArgs(filters),
        orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
        include: {
          decidedBy: { select: { name: true } },
          inspection: {
            select: {
              id: true,
              inspectionNumber: true,
              job: {
                select: {
                  id: true,
                  jobNumber: true,
                  component: { select: { componentCode: true, name: true } },
                  partner: { select: { businessName: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.deviationApproval.count({ where }),
    ]);

    const data = rows.map((row) => ({
      id: row.id,
      status: row.status,
      requestNote: row.requestNote,
      decisionNote: row.decisionNote,
      decidedByName: row.decidedBy?.name ?? null,
      decidedAt: row.decidedAt,
      createdAt: row.createdAt,
      inspectionId: row.inspection.id,
      inspectionNumber: row.inspection.inspectionNumber,
      jobId: row.inspection.job?.id ?? null,
      jobNumber: row.inspection.job?.jobNumber ?? null,
      componentCode: row.inspection.job?.component?.componentCode ?? null,
      partnerName: row.inspection.job?.partner?.businessName ?? null,
    }));

    return paginate(data, total, filters);
  }

  async createRework(actor: RequestUser, input: z.infer<typeof createReworkSchema>) {
    await this.assertJobScope(actor, input.jobId);
    const reworkNumber = await this.sequence.next('REWORK');
    const rework = await this.prisma.reworkOrder.create({
      data: {
        reworkNumber,
        jobId: input.jobId,
        inspectionId: input.inspectionId,
        nonConformanceId: input.nonConformanceId,
        quantity: input.quantity,
        instructions: input.instructions,
        estimatedCost: input.estimatedCost,
        chargeToPartner: input.chargeToPartner,
        dueDate: input.dueDate,
        issuedById: actor.id,
      },
      include: { job: { select: { id: true, jobNumber: true, partnerId: true } } },
    });
    await this.notifications.notify({
      event: 'REWORK_ISSUED',
      title: `Rework issued for ${rework.job.jobNumber}`,
      body: `${input.quantity} nos — ${input.instructions}`,
      link: `/partner/jobs/${input.jobId}`,
      entityType: 'ReworkOrder',
      entityId: rework.id,
      partnerId: rework.job.partnerId ?? undefined,
      channels: ['IN_APP', 'WHATSAPP'],
    });
    await this.audit.record(actor, {
      action: 'REWORK_ISSUED',
      entityType: 'ReworkOrder',
      entityId: rework.id,
      after: { jobId: input.jobId, quantity: input.quantity },
    });
    return rework;
  }

  async listRework(actor: RequestUser, filters: PaginationInput & { status?: string }) {
    const companyIds = allowedCompanyIds(actor);
    const where: Prisma.ReworkOrderWhereInput = {
      // Both clauses narrow the same relation, so they are merged rather than spread separately.
      ...(companyIds || actor.partnerId
        ? {
            job: {
              ...(companyIds ? { companyId: { in: companyIds } } : {}),
              ...(actor.partnerId ? { partnerId: actor.partnerId } : {}),
            },
          }
        : {}),
      ...(filters.status ? { status: filters.status as Prisma.EnumReworkStatusFilter } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.reworkOrder.findMany({
        where,
        ...paginationArgs(filters),
        orderBy: { issuedAt: 'desc' },
        include: {
          job: { select: { id: true, jobNumber: true, component: { select: { name: true } } } },
        },
      }),
      this.prisma.reworkOrder.count({ where }),
    ]);
    return paginate(data, total, filters);
  }

  async updateReworkStatus(
    actor: RequestUser,
    id: string,
    input: z.infer<typeof updateReworkStatusSchema>,
  ) {
    const existing = await this.prisma.reworkOrder.findUniqueOrThrow({
      where: { id },
      select: { jobId: true },
    });
    await this.assertJobScope(actor, existing.jobId);
    const rework = await this.prisma.reworkOrder.update({
      where: { id },
      data: {
        status: input.status,
        completedQuantity: input.completedQuantity,
        scrappedQuantity: input.scrappedQuantity,
        actualCost: input.actualCost,
        completedAt: input.status === 'COMPLETED' ? new Date() : undefined,
      },
    });

    // Rework charged to the partner becomes a deduction once the real cost is known.
    if (input.status === 'COMPLETED' && rework.chargeToPartner && rework.actualCost > 0) {
      const job = await this.prisma.gridJob.findUnique({
        where: { id: rework.jobId },
        select: { partnerId: true, jobNumber: true },
      });
      if (job?.partnerId) {
        const existing = await this.prisma.partnerDeduction.findFirst({
          where: { partnerId: job.partnerId, reason: { contains: rework.reworkNumber } },
        });
        if (!existing) {
          await this.prisma.partnerDeduction.create({
            data: {
              partnerId: job.partnerId,
              type: 'REWORK_DEDUCTION',
              amount: rework.actualCost,
              reason: `Rework ${rework.reworkNumber} on ${job.jobNumber}`,
            },
          });
        }
      }
    }

    await this.audit.record(actor, {
      action: 'REWORK_STATUS_UPDATED',
      entityType: 'ReworkOrder',
      entityId: id,
      after: {
        status: input.status,
        completedQuantity: input.completedQuantity,
        scrappedQuantity: input.scrappedQuantity,
        actualCost: input.actualCost,
        remarks: input.remarks,
      },
    });
    return rework;
  }

  async createCorrectiveAction(
    actor: RequestUser,
    input: z.infer<typeof createCorrectiveActionSchema>,
  ) {
    const nc = await this.prisma.nonConformance.findUniqueOrThrow({
      where: { id: input.nonConformanceId },
      select: { jobId: true },
    });
    await this.assertJobScope(actor, nc.jobId);
    const caNumber = await this.sequence.next('CA');
    const action = await this.prisma.correctiveAction.create({
      data: {
        caNumber,
        nonConformanceId: input.nonConformanceId,
        ownerId: input.ownerId,
        dueDate: input.dueDate,
        containment: input.containment,
        stage: input.containment ? 'CONTAINMENT' : 'ISSUE_RAISED',
      },
    });
    await this.audit.record(actor, {
      action: 'CORRECTIVE_ACTION_CREATED',
      entityType: 'CorrectiveAction',
      entityId: action.id,
      after: { caNumber, nonConformanceId: input.nonConformanceId },
    });
    return action;
  }

  /** Corrective actions move through containment → root cause → action → verification → closed. */
  async advanceCorrectiveAction(
    actor: RequestUser,
    id: string,
    input: z.infer<typeof advanceCorrectiveActionSchema>,
  ) {
    const current = await this.prisma.correctiveAction.findUniqueOrThrow({
      where: { id },
      include: { nonConformance: { select: { jobId: true } } },
    });
    await this.assertJobScope(actor, current.nonConformance.jobId);
    if (input.stage === 'CLOSED' && !(input.verification ?? current.verification)) {
      throw new BadRequestException('Verification evidence is required before closing');
    }
    const action = await this.prisma.correctiveAction.update({
      where: { id },
      data: {
        stage: input.stage,
        containment: input.containment ?? current.containment,
        rootCause: input.rootCause ?? current.rootCause,
        correctiveAction: input.correctiveAction ?? current.correctiveAction,
        verification: input.verification ?? current.verification,
        closedAt: input.stage === 'CLOSED' ? new Date() : null,
      },
    });
    if (input.stage === 'CLOSED') {
      await this.prisma.nonConformance.update({
        where: { id: current.nonConformanceId },
        data: { closedAt: new Date() },
      });
    }
    await this.audit.record(actor, {
      action: 'CORRECTIVE_ACTION_ADVANCED',
      entityType: 'CorrectiveAction',
      entityId: id,
      before: { stage: current.stage },
      after: { stage: input.stage },
    });
    return action;
  }

  async decideDeviation(
    actor: RequestUser,
    id: string,
    input: z.infer<typeof decideDeviationSchema>,
  ) {
    const existing = await this.prisma.deviationApproval.findUniqueOrThrow({
      where: { id },
      select: { inspectionId: true },
    });
    await this.assertInspectionScope(actor, existing.inspectionId);
    const deviation = await this.prisma.deviationApproval.update({
      where: { id },
      data: {
        status: input.status,
        decisionNote: input.decisionNote,
        decidedById: actor.id,
        decidedAt: new Date(),
      },
    });
    await this.audit.record(actor, {
      action: 'DEVIATION_DECIDED',
      entityType: 'DeviationApproval',
      entityId: id,
      after: { status: input.status, decisionNote: input.decisionNote },
    });
    return deviation;
  }
}
