import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { GridJob, JobStatus, Prisma } from '@gridx/db';
import {
  ALLOCATABLE_PARTNER_STATUSES,
  AllocationInput,
  CreateJobInput,
  JOB_STATUS_TRANSITIONS,
  JobSummary,
  Paginated,
  PaginationInput,
  PartnerRecommendation,
  UpdateMilestoneInput,
  allocateJobSchema,
  answerClarificationSchema,
  clarificationSchema,
  closeJobSchema,
  reportDelaySchema,
  respondToJobSchema,
  scorePartnerForJob,
  updateJobSchema,
} from '@gridx/shared';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SequenceService } from '../audit/sequence.service';
import { RequestUser } from '../common/request-user';
import { paginate, paginationArgs } from '../common/pagination';
import { assertTransition } from '../common/workflow';
import { FilesService } from '../files/files.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface JobFilters extends PaginationInput {
  status?: JobStatus;
  partnerId?: string;
  componentId?: string;
  priority?: string;
  companyId?: string;
  overdue?: boolean;
}

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sequence: SequenceService,
    private readonly files: FilesService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Partner users only ever see jobs assigned to their own partner. */
  private scopeWhere(actor: RequestUser): Prisma.GridJobWhereInput {
    return actor.userType === 'PARTNER' ? { partnerId: actor.partnerId ?? '' } : {};
  }

  private async assertJobScope(actor: RequestUser, jobId: string): Promise<GridJob> {
    const job = await this.prisma.gridJob.findUniqueOrThrow({ where: { id: jobId } });
    if (actor.userType === 'PARTNER' && job.partnerId !== actor.partnerId) {
      throw new ForbiddenException('This job is not assigned to you');
    }
    return job;
  }

  async list(actor: RequestUser, filters: JobFilters): Promise<Paginated<JobSummary>> {
    const where: Prisma.GridJobWhereInput = {
      ...this.scopeWhere(actor),
      ...(filters.companyId ? { companyId: filters.companyId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.partnerId ? { partnerId: filters.partnerId } : {}),
      ...(filters.componentId ? { componentId: filters.componentId } : {}),
      ...(filters.priority ? { priority: filters.priority as GridJob['priority'] } : {}),
      ...(filters.overdue
        ? {
            dueDate: { lt: new Date() },
            status: { notIn: ['CLOSED', 'CANCELLED', 'RECEIVED'] },
          }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { jobNumber: { contains: filters.search, mode: 'insensitive' } },
              { component: { componentCode: { contains: filters.search, mode: 'insensitive' } } },
              { component: { name: { contains: filters.search, mode: 'insensitive' } } },
              { partner: { businessName: { contains: filters.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.gridJob.findMany({
        where,
        ...paginationArgs(filters),
        orderBy: { [filters.sortBy ?? 'createdAt']: filters.sortDir },
        include: {
          component: { select: { componentCode: true, name: true, criticality: true } },
          partner: { select: { id: true, businessName: true } },
          milestones: { orderBy: { reportedAt: 'desc' }, take: 1 },
        },
      }),
      this.prisma.gridJob.count({ where }),
    ]);

    const data: JobSummary[] = rows.map((job) => ({
      id: job.id,
      jobNumber: job.jobNumber,
      componentCode: job.component.componentCode,
      componentName: job.component.name,
      criticality: job.component.criticality,
      partnerId: job.partnerId,
      partnerName: job.partner?.businessName ?? null,
      quantity: job.quantity,
      acceptedQuantity: job.acceptedQuantity,
      rejectedQuantity: job.rejectedQuantity,
      status: job.status,
      priority: job.priority,
      dueDate: job.dueDate.toISOString(),
      rate: job.rate,
      value: job.rate * job.quantity,
      latestMilestone: job.milestones[0]?.type ?? null,
      isOverdue:
        job.dueDate < new Date() && !['CLOSED', 'CANCELLED', 'RECEIVED'].includes(job.status),
      materialResponsibility: job.materialResponsibility,
      delayDays: Math.max(
        0,
        Math.ceil((Date.now() - job.dueDate.getTime()) / (24 * 3600 * 1000)),
      ),
    }));
    return paginate(data, total, filters);
  }

  async findOne(actor: RequestUser, id: string) {
    await this.assertJobScope(actor, id);
    const job = await this.prisma.gridJob.findUniqueOrThrow({
      where: { id },
      include: {
        component: { include: { processes: { include: { process: true } } } },
        product: true,
        partner: {
          select: {
            id: true,
            partnerCode: true,
            businessName: true,
            ownerName: true,
            phone: true,
            city: true,
            currentScore: true,
            category: true,
          },
        },
        drawingRevision: { include: { drawing: true } },
        inspectionPlan: { include: { characteristics: true } },
        assignments: {
          orderBy: { assignedAt: 'desc' },
          include: { partner: { select: { id: true, businessName: true } } },
        },
        milestones: { orderBy: { reportedAt: 'desc' } },
        statusHistory: { orderBy: { createdAt: 'desc' } },
        delays: { orderBy: { reportedAt: 'desc' } },
        clarifications: { orderBy: { raisedAt: 'desc' } },
        materialIssues: { include: { items: { include: { item: true } } } },
        inspections: { orderBy: { requestedAt: 'desc' } },
        reworkOrders: { orderBy: { createdAt: 'desc' } },
        shipmentItems: { include: { shipment: true } },
        invoiceItems: { include: { invoice: true } },
        reconciliations: { include: { item: true } },
      },
    });
    const photographs = await this.files.photographsFor('GridJob', id);
    return { ...job, photographs };
  }

  async create(actor: RequestUser, input: CreateJobInput): Promise<GridJob> {
    const component = await this.prisma.component.findUniqueOrThrow({
      where: { id: input.componentId },
    });
    if (component.criticality === 'CLASS_A' && !input.classAOverrideReason) {
      throw new BadRequestException(
        'Class A components require a documented authorisation reason before outsourcing',
      );
    }

    const jobNumber = await this.sequence.next('JOB');
    const job = await this.prisma.gridJob.create({
      data: {
        jobNumber,
        companyId: input.companyId,
        source: input.source,
        sourceRef: input.sourceRef,
        customerProject: input.customerProject,
        productId: input.productId,
        componentId: input.componentId,
        drawingRevisionId: input.drawingRevisionId,
        quantity: input.quantity,
        partnerId: input.partnerId,
        plannedStartDate: input.plannedStartDate,
        dueDate: input.dueDate,
        materialResponsibility: input.materialResponsibility,
        rate: input.rate,
        inspectionPlanId: input.inspectionPlanId,
        deliveryLocation: input.deliveryLocation,
        priority: input.priority,
        notes: input.notes,
        classAOverrideById: input.classAOverrideReason ? actor.id : null,
        classAOverrideReason: input.classAOverrideReason,
        createdById: actor.id,
        statusHistory: { create: { toStatus: 'DRAFT', changedById: actor.id } },
      },
    });
    await this.audit.record(actor, {
      action: 'JOB_CREATED',
      entityType: 'GridJob',
      entityId: job.id,
      companyId: job.companyId,
      after: { jobNumber, componentId: job.componentId, quantity: job.quantity },
    });
    return job;
  }

  async update(actor: RequestUser, id: string, input: z.infer<typeof updateJobSchema>) {
    const before = await this.prisma.gridJob.findUniqueOrThrow({ where: { id } });
    if (['CLOSED', 'CANCELLED'].includes(before.status)) {
      throw new BadRequestException('Closed jobs cannot be edited');
    }
    const job = await this.prisma.gridJob.update({ where: { id }, data: input });
    await this.audit.record(actor, {
      action: 'JOB_UPDATED',
      entityType: 'GridJob',
      entityId: id,
      companyId: job.companyId,
      before: { quantity: before.quantity, dueDate: before.dueDate.toISOString(), rate: before.rate },
      after: { quantity: job.quantity, dueDate: job.dueDate.toISOString(), rate: job.rate },
    });
    return job;
  }

  /** Module 4 — partner recommendation engine. Ranks approved partners, never auto-allocates. */
  async recommendations(jobId: string): Promise<PartnerRecommendation[]> {
    const job = await this.prisma.gridJob.findUniqueOrThrow({
      where: { id: jobId },
      include: { component: true },
    });
    const approved = await this.prisma.approvedPartnerComponent.findMany({
      where: { componentId: job.componentId, isActive: true },
      include: {
        partner: {
          include: {
            capabilities: true,
            capacityAllocations: {
              where: { job: { status: { notIn: ['CLOSED', 'CANCELLED'] } } },
            },
            rates: { where: { componentId: job.componentId, isActive: true } },
            kpis: { orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }], take: 12 },
          },
        },
      },
    });

    const componentHours = await this.estimatedHours(job.componentId, job.quantity);
    const candidateRates = approved.map(
      (link) => link.partner.rates[0]?.conversionRate ?? job.rate,
    );
    const bestRate = candidateRates.length > 0 ? Math.min(...candidateRates) : job.rate;
    const networkValue = await this.prisma.gridJob.findMany({
      where: { status: { notIn: ['CANCELLED'] } },
      select: { partnerId: true, rate: true, quantity: true },
    });
    const totalNetworkValue = networkValue.reduce(
      (sum, item) => sum + item.rate * item.quantity,
      0,
    );

    const recommendations = await Promise.all(
      approved.map(async (link) => {
        const partner = link.partner;
        const openJobs = await this.prisma.gridJob.count({
          where: { partnerId: partner.id, status: { notIn: ['CLOSED', 'CANCELLED'] } },
        });
        const committedHours = partner.capacityAllocations.reduce(
          (sum, allocation) => sum + allocation.allocatedHours,
          0,
        );
        const capability = partner.capabilities.find(
          (item) => item.process === job.component.primaryProcess,
        );
        const rate = partner.rates[0]?.conversionRate ?? job.rate;
        const freeCapacityHours = Math.max(0, partner.maxCapacityHours - committedHours);
        const onTimeDeliveryPercent =
          partner.kpis.find((kpi) => kpi.code === 'ON_TIME_IN_FULL_DELIVERY')?.value ?? 0;
        const firstPassQualityPercent =
          partner.kpis.find((kpi) => kpi.code === 'FIRST_PASS_QUALITY')?.value ?? 0;
        const partnerValue = networkValue
          .filter((item) => item.partnerId === partner.id)
          .reduce((sum, item) => sum + item.rate * item.quantity, 0);

        const input: AllocationInput = {
          hasApprovedCapability: Boolean(capability?.isApproved) && link.isActive,
          partnerRating: partner.currentScore ?? 0,
          freeCapacityHours,
          requiredHours: componentHours,
          onTimeDeliveryPercent,
          distanceKm: partner.distanceKm ?? 0,
          openJobs,
          maxOpenJobs: partner.maxOpenJobs,
          conversionRate: rate,
          bestConversionRate: bestRate,
          firstPassQualityPercent,
          networkSharePercent: totalNetworkValue > 0 ? (partnerValue / totalNetworkValue) * 100 : 0,
        };
        const score = scorePartnerForJob(input);
        const blockers = [...score.blockers];
        if (
          !partner.isActive ||
          !(ALLOCATABLE_PARTNER_STATUSES as readonly string[]).includes(partner.approvalStatus)
        ) {
          blockers.push('Partner is not approved for allocation');
        }
        if (openJobs >= partner.maxOpenJobs) blockers.push('Open job limit reached');

        return {
          partnerId: partner.id,
          partnerCode: partner.partnerCode,
          businessName: partner.businessName,
          city: partner.city,
          distanceKm: partner.distanceKm,
          category: partner.category,
          score: score.total,
          rating: partner.currentScore ?? 0,
          freeCapacityHours,
          openJobs,
          onTimeDeliveryPercent,
          firstPassQualityPercent,
          conversionRate: rate,
          networkSharePercent: input.networkSharePercent,
          blockers,
          breakdown: score.breakdown,
        } satisfies PartnerRecommendation;
      }),
    );
    return recommendations.sort((a, b) => b.score - a.score);
  }

  /** Rough job hours from the component routing, used for capacity-aware recommendations. */
  private async estimatedHours(componentId: string, quantity: number): Promise<number> {
    const processes = await this.prisma.componentProcess.findMany({ where: { componentId } });
    const minutes = processes.reduce(
      (sum, process) => sum + (process.cycleTimeMinutes ?? 0) * quantity,
      0,
    );
    return Math.round((minutes / 60) * 100) / 100;
  }

  async allocate(actor: RequestUser, id: string, input: z.infer<typeof allocateJobSchema>) {
    const job = await this.prisma.gridJob.findUniqueOrThrow({
      where: { id },
      include: { component: true },
    });
    const partner = await this.prisma.partner.findUniqueOrThrow({
      where: { id: input.partnerId },
      include: { capabilities: true },
    });

    if (
      !partner.isActive ||
      !(ALLOCATABLE_PARTNER_STATUSES as readonly string[]).includes(partner.approvalStatus)
    ) {
      throw new BadRequestException(`${partner.businessName} is not approved for allocation`);
    }
    const approvedForComponent = await this.prisma.approvedPartnerComponent.findFirst({
      where: { componentId: job.componentId, partnerId: partner.id, isActive: true },
    });
    if (!approvedForComponent) {
      throw new BadRequestException(
        `${partner.businessName} is not on the approved partner list for ${job.component.componentCode}`,
      );
    }
    if (job.component.criticality === 'CLASS_A' && !input.classAOverrideReason) {
      throw new BadRequestException('Class A allocation requires a documented authorisation');
    }
    const openJobs = await this.prisma.gridJob.count({
      where: { partnerId: partner.id, status: { notIn: ['CLOSED', 'CANCELLED'] } },
    });
    if (openJobs >= partner.maxOpenJobs) {
      throw new BadRequestException(
        `${partner.businessName} already has ${openJobs} open jobs (limit ${partner.maxOpenJobs})`,
      );
    }

    const recommendation = (await this.recommendations(id)).find(
      (item) => item.partnerId === partner.id,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.jobAssignment.updateMany({ where: { jobId: id }, data: { isActive: false } });
      await tx.jobAssignment.create({
        data: {
          jobId: id,
          partnerId: partner.id,
          assignedById: actor.id,
          recommendationScore: recommendation?.score ?? null,
          recommendationDetail: recommendation
            ? (recommendation.breakdown as unknown as Prisma.InputJsonValue)
            : undefined,
        },
      });
      const result = await tx.gridJob.update({
        where: { id },
        data: {
          partnerId: partner.id,
          rate: input.rate ?? job.rate,
          status: 'AWAITING_PARTNER_ACCEPTANCE',
          classAOverrideById: input.classAOverrideReason ? actor.id : job.classAOverrideById,
          classAOverrideReason: input.classAOverrideReason ?? job.classAOverrideReason,
          statusHistory: {
            create: {
              fromStatus: job.status,
              toStatus: 'AWAITING_PARTNER_ACCEPTANCE',
              reason: `Allocated to ${partner.businessName}`,
              changedById: actor.id,
            },
          },
        },
      });
      if (input.grantDrawingAccess && job.drawingRevisionId) {
        await tx.drawingAccess.upsert({
          where: {
            revisionId_partnerId_jobId: {
              revisionId: job.drawingRevisionId,
              partnerId: partner.id,
              jobId: id,
            },
          },
          create: {
            revisionId: job.drawingRevisionId,
            partnerId: partner.id,
            jobId: id,
            grantedBy: actor.id,
          },
          update: { revokedAt: null, revokedBy: null },
        });
        await tx.drawingAccessLog.create({
          data: {
            revisionId: job.drawingRevisionId,
            partnerId: partner.id,
            userId: actor.id,
            jobId: id,
            event: 'GRANTED',
          },
        });
      }
      return result;
    });

    await this.notifications.notify({
      event: 'NEW_JOB_ASSIGNED',
      title: `New job ${job.jobNumber} assigned to you`,
      body: `${job.component.componentCode} — ${job.quantity} nos, due ${job.dueDate.toDateString()}.`,
      link: `/partner/jobs/${id}`,
      entityType: 'GridJob',
      entityId: id,
      partnerId: partner.id,
      channels: ['IN_APP', 'WHATSAPP'],
    });
    await this.audit.record(actor, {
      action: 'JOB_ALLOCATED',
      entityType: 'GridJob',
      entityId: id,
      companyId: job.companyId,
      before: { partnerId: job.partnerId, status: job.status },
      after: { partnerId: partner.id, status: updated.status },
    });
    return updated;
  }

  async respond(actor: RequestUser, id: string, input: z.infer<typeof respondToJobSchema>) {
    const job = await this.assertJobScope(actor, id);
    if (job.status !== 'AWAITING_PARTNER_ACCEPTANCE') {
      throw new BadRequestException('This job is not awaiting your acceptance');
    }
    if (!input.accepted && !input.declineReason) {
      throw new BadRequestException('A reason is required when declining a job');
    }

    const nextStatus: JobStatus = input.accepted ? 'ACCEPTED' : 'DRAFT';
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.jobAssignment.updateMany({
        where: { jobId: id, partnerId: job.partnerId ?? '', isActive: true },
        data: {
          respondedAt: new Date(),
          accepted: input.accepted,
          declineReason: input.declineReason,
          isActive: input.accepted,
        },
      });
      return tx.gridJob.update({
        where: { id },
        data: {
          status: nextStatus,
          acceptedAt: input.accepted ? new Date() : null,
          declinedAt: input.accepted ? null : new Date(),
          declineReason: input.declineReason,
          partnerId: input.accepted ? job.partnerId : null,
          statusHistory: {
            create: {
              fromStatus: job.status,
              toStatus: nextStatus,
              reason: input.accepted ? 'Partner accepted' : `Declined: ${input.declineReason}`,
              changedById: actor.id,
            },
          },
        },
      });
    });

    await this.notifications.notify({
      event: input.accepted ? 'JOB_ACCEPTED' : 'JOB_DECLINED',
      title: `Job ${job.jobNumber} ${input.accepted ? 'accepted' : 'declined'}`,
      body: input.accepted
        ? 'The partner accepted the job. Issue material to start production.'
        : `Reason: ${input.declineReason}`,
      link: `/control/production/jobs/${id}`,
      entityType: 'GridJob',
      entityId: id,
      roleCodes: ['OPERATIONS_HEAD', 'GRIDX_HEAD'],
    });
    await this.audit.record(actor, {
      action: input.accepted ? 'JOB_ACCEPTED' : 'JOB_DECLINED',
      entityType: 'GridJob',
      entityId: id,
      companyId: job.companyId,
      after: { accepted: input.accepted, reason: input.declineReason ?? null },
    });
    return updated;
  }

  /** Milestone updates come from the partner PWA and may arrive from the offline queue. */
  async updateMilestone(actor: RequestUser, id: string, input: UpdateMilestoneInput) {
    const job = await this.assertJobScope(actor, id);

    if (input.clientRequestId) {
      const existing = await this.prisma.jobMilestone.findUnique({
        where: { clientRequestId: input.clientRequestId },
      });
      if (existing) return existing;
    }

    const milestone = await this.prisma.jobMilestone.create({
      data: {
        jobId: id,
        type: input.type,
        quantityCompleted: input.quantityCompleted,
        remarks: input.remarks,
        expectedCompletionDate: input.expectedCompletionDate,
        reportedById: actor.id,
        isOverdue: job.dueDate < new Date(),
        syncedFromOffline: Boolean(input.clientRequestId),
        clientRequestId: input.clientRequestId,
      },
    });
    await this.files.attachPhotographs(input.photographFileIds, 'GridJob', id, input.type);

    if (input.delayReason) {
      await this.prisma.jobDelay.create({
        data: {
          jobId: id,
          reason: input.delayReason,
          responsibility: 'PARTNER',
          detail: input.remarks,
          expectedCompletionDate: input.expectedCompletionDate,
          reportedById: actor.id,
        },
      });
    }

    if (input.type === 'PRODUCTION_STARTED' && job.status !== 'IN_PRODUCTION') {
      await this.transition(actor, id, 'IN_PRODUCTION', 'Production started by partner');
    }

    await this.audit.record(actor, {
      action: 'JOB_MILESTONE_UPDATED',
      entityType: 'JobMilestone',
      entityId: milestone.id,
      companyId: job.companyId,
      after: { jobId: id, type: input.type, quantityCompleted: input.quantityCompleted ?? null },
    });
    return milestone;
  }

  async reportDelay(actor: RequestUser, id: string, input: z.infer<typeof reportDelaySchema>) {
    const job = await this.assertJobScope(actor, id);
    const delay = await this.prisma.jobDelay.create({
      data: {
        jobId: id,
        reason: input.reason,
        responsibility: input.responsibility ?? 'PARTNER',
        delayDays: input.delayDays,
        detail: input.detail,
        expectedCompletionDate: input.expectedCompletionDate,
        reportedById: actor.id,
      },
    });
    await this.notifications.notify({
      event: 'JOB_DELAY_REPORTED',
      title: `Delay reported on ${job.jobNumber}`,
      body: `${input.reason} — ${input.delayDays} day(s).`,
      link: `/control/production/jobs/${id}`,
      entityType: 'GridJob',
      entityId: id,
      roleCodes: ['OPERATIONS_HEAD', 'GRIDX_HEAD'],
    });
    return delay;
  }

  async raiseClarification(
    actor: RequestUser,
    id: string,
    input: z.infer<typeof clarificationSchema>,
  ) {
    const job = await this.assertJobScope(actor, id);
    const clarification = await this.prisma.jobClarification.create({
      data: { jobId: id, question: input.question, raisedById: actor.id },
    });
    await this.notifications.notify({
      event: 'JOB_CLARIFICATION_RAISED',
      title: `Clarification raised on ${job.jobNumber}`,
      body: input.question,
      link: `/control/production/jobs/${id}`,
      entityType: 'JobClarification',
      entityId: clarification.id,
      roleCodes: ['ENGINEERING_USER', 'OPERATIONS_HEAD'],
    });
    return clarification;
  }

  async answerClarification(
    actor: RequestUser,
    clarificationId: string,
    input: z.infer<typeof answerClarificationSchema>,
  ) {
    const clarification = await this.prisma.jobClarification.update({
      where: { id: clarificationId },
      data: {
        answer: input.answer,
        status: 'ANSWERED',
        answeredById: actor.id,
        answeredAt: new Date(),
      },
      include: { job: true },
    });
    await this.notifications.notify({
      event: 'JOB_CLARIFICATION_ANSWERED',
      title: `Clarification answered for ${clarification.job.jobNumber}`,
      body: input.answer,
      link: `/partner/jobs/${clarification.jobId}`,
      entityType: 'JobClarification',
      entityId: clarificationId,
      partnerId: clarification.job.partnerId ?? undefined,
    });
    return clarification;
  }

  async close(actor: RequestUser, id: string, input: z.infer<typeof closeJobSchema>) {
    const job = await this.prisma.gridJob.findUniqueOrThrow({
      where: { id },
      include: { reconciliations: true, invoiceItems: true },
    });
    if (job.materialResponsibility === 'OSWAR_SUPPLIED') {
      const pending = job.reconciliations.filter((entry) => entry.status !== 'BALANCED');
      if (job.reconciliations.length === 0 || pending.length > 0) {
        throw new BadRequestException('Material must be reconciled before the job can be closed');
      }
    }
    const updated = await this.transition(actor, id, 'CLOSED', input.remarks ?? 'Job closed', {
      receivedQuantity: input.receivedQuantity ?? job.receivedQuantity,
      closedAt: new Date(),
    });
    await this.audit.record(actor, {
      action: 'JOB_CLOSED',
      entityType: 'GridJob',
      entityId: id,
      companyId: job.companyId,
      after: { receivedQuantity: updated.receivedQuantity },
    });
    return updated;
  }

  async cancel(actor: RequestUser, id: string, reason: string) {
    return this.transition(actor, id, 'CANCELLED', reason);
  }

  /** Single guarded status change used by every module that advances a job. */
  async transition(
    actor: RequestUser | null,
    id: string,
    toStatus: JobStatus,
    reason?: string,
    extra: Prisma.GridJobUpdateInput = {},
  ): Promise<GridJob> {
    const job = await this.prisma.gridJob.findUniqueOrThrow({ where: { id } });
    assertTransition('Job', job.status, toStatus, JOB_STATUS_TRANSITIONS);
    return this.prisma.gridJob.update({
      where: { id },
      data: {
        ...extra,
        status: toStatus,
        statusHistory: {
          create: {
            fromStatus: job.status,
            toStatus,
            reason,
            changedById: actor?.id,
          },
        },
      },
    });
  }
}
