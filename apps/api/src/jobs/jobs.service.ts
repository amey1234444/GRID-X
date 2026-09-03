import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  ClarificationStatus,
  DelayReason,
  GridJob,
  JobStatus,
  MilestoneType,
  Prisma,
  ResponsibleParty,
} from '@gridx/db';
import {
  ALLOCATABLE_PARTNER_STATUSES,
  outsourcingEligibility,
  AllocationInput,
  CreateJobInput,
  JOB_STATUS_TRANSITIONS,
  JobSummary,
  MILESTONES_REQUIRING_FIRST_ARTICLE,
  Paginated,
  PaginationInput,
  PartnerRecommendation,
  PERMISSIONS,
  UpdateMilestoneInput,
  allocateJobSchema,
  answerClarificationSchema,
  clarificationSchema,
  closeJobSchema,
  reportDelaySchema,
  requiresFirstArticle,
  responsibilityForDelay,
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
import { assertMilestoneEvidence } from '../common/evidence';
import {
  assertCanWriteToCompany,
  assertCompanyScope,
  companyWhere,
} from '../common/company-scope';
import { CapacityService, DeclaredCapacity } from '../capacity/capacity.service';
import { DrawingsService } from '../drawings/drawings.service';
import { ImsService } from '../ims/ims.service';
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

export interface DelayFilters extends PaginationInput {
  companyId?: string;
  partnerId?: string;
  reason?: DelayReason;
  responsibility?: ResponsibleParty;
  /** Hide delays that have already been closed out. */
  openOnly?: boolean;
}

export interface DelayRow {
  id: string;
  jobId: string;
  jobNumber: string;
  componentCode: string;
  componentName: string;
  partnerId: string | null;
  partnerName: string | null;
  jobStatus: JobStatus;
  dueDate: Date | null;
  reason: DelayReason;
  responsibility: ResponsibleParty;
  delayDays: number;
  detail: string | null;
  expectedCompletionDate: Date | null;
  reportedByName: string | null;
  reportedAt: Date;
  resolvedAt: Date | null;
}

export interface ClarificationFilters extends PaginationInput {
  companyId?: string;
  partnerId?: string;
  status?: ClarificationStatus;
}

export interface ClarificationRow {
  id: string;
  jobId: string;
  jobNumber: string;
  componentCode: string;
  componentName: string;
  partnerId: string | null;
  partnerName: string | null;
  dueDate: Date | null;
  question: string;
  answer: string | null;
  status: ClarificationStatus;
  raisedByName: string | null;
  raisedAt: Date;
  answeredByName: string | null;
  answeredAt: Date | null;
  /** How long an open question has been waiting. Null once answered. */
  openForDays: number | null;
}

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sequence: SequenceService,
    private readonly files: FilesService,
    private readonly notifications: NotificationsService,
    private readonly capacity: CapacityService,
    private readonly ims: ImsService,
    private readonly drawings: DrawingsService,
  ) {}

  /**
   * Partner users only ever see jobs assigned to their own partner; internal users only ever see
   * jobs belonging to a company they are linked to (Section 4).
   */
  private scopeWhere(actor: RequestUser, companyId?: string): Prisma.GridJobWhereInput {
    return {
      ...companyWhere(actor, companyId),
      ...(actor.userType === 'PARTNER' ? { partnerId: actor.partnerId ?? '' } : {}),
    };
  }

  /**
   * Section 12's \"get delayed jobs\", and the pilot criterion that management can identify delays
   * without calling every workshop. Until this existed a delay was only visible by opening the one
   * job it belonged to, which made the reason and responsibility recorded against it unreadable in
   * aggregate.
   */
  async listDelays(actor: RequestUser, filters: DelayFilters): Promise<Paginated<DelayRow>> {
    const where: Prisma.JobDelayWhereInput = {
      job: this.scopeWhere(actor, filters.companyId),
      ...(filters.reason ? { reason: filters.reason } : {}),
      ...(filters.responsibility ? { responsibility: filters.responsibility } : {}),
      ...(filters.partnerId ? { job: { partnerId: filters.partnerId } } : {}),
      ...(filters.openOnly ? { resolvedAt: null } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.jobDelay.findMany({
        where,
        ...paginationArgs(filters),
        orderBy: { reportedAt: 'desc' },
        include: {
          job: {
            select: {
              id: true,
              jobNumber: true,
              dueDate: true,
              status: true,
              partner: { select: { id: true, businessName: true } },
              component: { select: { componentCode: true, name: true } },
            },
          },
          reportedBy: { select: { name: true } },
        },
      }),
      this.prisma.jobDelay.count({ where }),
    ]);

    const data: DelayRow[] = rows.map((delay) => ({
      id: delay.id,
      jobId: delay.job.id,
      jobNumber: delay.job.jobNumber,
      componentCode: delay.job.component.componentCode,
      componentName: delay.job.component.name,
      partnerId: delay.job.partner?.id ?? null,
      partnerName: delay.job.partner?.businessName ?? null,
      jobStatus: delay.job.status,
      dueDate: delay.job.dueDate,
      reason: delay.reason,
      responsibility: delay.responsibility,
      delayDays: delay.delayDays,
      detail: delay.detail,
      expectedCompletionDate: delay.expectedCompletionDate,
      reportedByName: delay.reportedBy?.name ?? null,
      reportedAt: delay.reportedAt,
      resolvedAt: delay.resolvedAt,
    }));

    return paginate(data, total, filters);
  }

  /** Closes a delay once the job has recovered, so the queue shows what is still outstanding. */
  async resolveDelay(actor: RequestUser, delayId: string): Promise<{ id: string }> {
    const delay = await this.prisma.jobDelay.findUniqueOrThrow({
      where: { id: delayId },
      include: { job: { select: { id: true, companyId: true, partnerId: true } } },
    });
    await this.assertJobScope(actor, delay.job.id);
    if (delay.resolvedAt) return { id: delay.id };

    await this.prisma.jobDelay.update({
      where: { id: delayId },
      data: { resolvedAt: new Date() },
    });
    await this.audit.record(actor, {
      action: 'JOB_DELAY_RESOLVED',
      entityType: 'JobDelay',
      entityId: delayId,
      companyId: delay.job.companyId,
    });
    return { id: delayId };
  }

  /**
   * The clarification queue (Section 24, Production - Clarifications). A partner raising a question
   * previously reached nobody: the record could only be read by opening that exact job, so a
   * question could sit unanswered indefinitely while the job ran late for want of an answer.
   */
  async listClarifications(
    actor: RequestUser,
    filters: ClarificationFilters,
  ): Promise<Paginated<ClarificationRow>> {
    const where: Prisma.JobClarificationWhereInput = {
      job: this.scopeWhere(actor, filters.companyId),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.partnerId ? { job: { partnerId: filters.partnerId } } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.jobClarification.findMany({
        where,
        ...paginationArgs(filters),
        // Open questions first, then oldest first: the one waiting longest is the one hurting most.
        orderBy: [{ status: 'asc' }, { raisedAt: 'asc' }],
        include: {
          job: {
            select: {
              id: true,
              jobNumber: true,
              dueDate: true,
              partner: { select: { id: true, businessName: true } },
              component: { select: { componentCode: true, name: true } },
            },
          },
          raisedBy: { select: { name: true } },
          answeredBy: { select: { name: true } },
        },
      }),
      this.prisma.jobClarification.count({ where }),
    ]);

    const now = Date.now();
    const data: ClarificationRow[] = rows.map((row) => ({
      id: row.id,
      jobId: row.job.id,
      jobNumber: row.job.jobNumber,
      componentCode: row.job.component.componentCode,
      componentName: row.job.component.name,
      partnerId: row.job.partner?.id ?? null,
      partnerName: row.job.partner?.businessName ?? null,
      dueDate: row.job.dueDate,
      question: row.question,
      answer: row.answer,
      status: row.status,
      raisedByName: row.raisedBy?.name ?? null,
      raisedAt: row.raisedAt,
      answeredByName: row.answeredBy?.name ?? null,
      answeredAt: row.answeredAt,
      openForDays:
        row.status === 'OPEN'
          ? Math.floor((now - row.raisedAt.getTime()) / 86_400_000)
          : null,
    }));

    return paginate(data, total, filters);
  }

  private async assertJobScope(actor: RequestUser, jobId: string): Promise<GridJob> {
    const job = await this.prisma.gridJob.findUniqueOrThrow({ where: { id: jobId } });
    if (actor.userType === 'PARTNER' && job.partnerId !== actor.partnerId) {
      throw new ForbiddenException('This job is not assigned to you');
    }
    assertCompanyScope(actor, job.companyId, 'job');
    return job;
  }

  async list(actor: RequestUser, filters: JobFilters): Promise<Paginated<JobSummary>> {
    const where: Prisma.GridJobWhereInput = {
      ...this.scopeWhere(actor, filters.companyId),
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

  /**
   * Module 2 — "the system should prevent Class A components from being allocated externally
   * unless authorised by senior management". A reason alone is not authorisation: the actor must
   * also hold `job:class_a_override`, which only the Group Admin and GRID-X Head roles carry.
   */
  private assertClassAAuthorised(
    actor: RequestUser,
    criticality: string,
    reason: string | undefined,
    action: string,
    existingAuthorisationBy?: string | null,
  ): void {
    if (criticality !== 'CLASS_A') return;

    // An authorisation already granted on this job stands: whoever recorded it had to hold the
    // permission at the time, so a planner may act on it without holding it themselves.
    if (!reason && existingAuthorisationBy) return;

    if (!reason) {
      throw new BadRequestException(
        `${action} a Class A component requires a documented authorisation reason`,
      );
    }
    if (!actor.permissions.includes(PERMISSIONS.JOB_CLASS_A_OVERRIDE)) {
      throw new ForbiddenException(
        'Class A components may only be outsourced with senior management authorisation. ' +
          'Ask the GRID-X Head or a Group Admin to authorise this job.',
      );
    }
  }

  /**
   * Module 2's outsourcing eligibility score, which until now was recorded and never read. It is a
   * separate judgement from criticality: engineering may mark a low-class part unsuitable to send
   * out because of tooling or tolerance, and that judgement should be as hard to walk past as the
   * Class A rule. Overriding it takes the same senior authorisation.
   */
  private assertOutsourcingEligible(
    actor: RequestUser,
    score: number,
    reason: string | undefined,
    existingAuthorisationBy?: string | null,
  ): void {
    const verdict = outsourcingEligibility(score);
    if (verdict.eligible) return;
    if (!reason && existingAuthorisationBy) return;

    if (!reason) {
      throw new BadRequestException(
        `${verdict.reason} Outsourcing it anyway requires a documented authorisation reason.`,
      );
    }
    if (!actor.permissions.includes(PERMISSIONS.JOB_CLASS_A_OVERRIDE)) {
      throw new ForbiddenException(
        `${verdict.reason} Ask the GRID-X Head or a Group Admin to authorise this job.`,
      );
    }
  }

  async create(actor: RequestUser, input: CreateJobInput): Promise<GridJob> {
    assertCanWriteToCompany(actor, input.companyId);
    const component = await this.prisma.component.findUniqueOrThrow({
      where: { id: input.componentId },
    });
    assertCompanyScope(actor, component.companyId, 'component');
    this.assertClassAAuthorised(
      actor,
      component.criticality,
      input.classAOverrideReason,
      'Outsourcing',
    );
    this.assertOutsourcingEligible(
      actor,
      component.outsourcingEligibilityScore,
      input.classAOverrideReason,
    );

    // Section 11 `GridJobItem` — a job raised from one order covering several components. The
    // model existed with quantities and rates and had no write path anywhere, so a multi-component
    // order had to be split into separate jobs and lost the fact that it was one delivery.
    //
    // The header component stays the primary line: everything downstream — the drawing, the
    // inspection plan, the material bill — hangs off it, and the extra lines ride alongside.
    const additionalItems = input.items ?? [];
    if (additionalItems.length > 0) {
      const components = await this.prisma.component.findMany({
        where: { id: { in: additionalItems.map((item) => item.componentId) } },
        select: { id: true, componentCode: true, companyId: true, criticality: true, outsourcingEligibilityScore: true },
      });
      if (components.length !== new Set(additionalItems.map((i) => i.componentId)).size) {
        throw new BadRequestException('One of the additional components does not exist');
      }
      // Each line is a separate outsourcing decision and is checked as one; a Class A part cannot
      // ride into the network as a line item on a job about something else.
      for (const line of components) {
        assertCompanyScope(actor, line.companyId, 'component');
        this.assertClassAAuthorised(
          actor,
          line.criticality,
          input.classAOverrideReason,
          `Outsourcing ${line.componentCode}`,
        );
        this.assertOutsourcingEligible(
          actor,
          line.outsourcingEligibilityScore,
          input.classAOverrideReason,
        );
      }
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
        items: {
          create: [
            // The header component as line 1, so a job's lines are the whole job rather than
            // "everything except the main thing".
            {
              componentId: input.componentId,
              drawingRevisionId: input.drawingRevisionId,
              quantity: input.quantity,
              rate: input.rate,
            },
            ...additionalItems.map((item) => ({
              componentId: item.componentId,
              drawingRevisionId: item.drawingRevisionId,
              quantity: item.quantity,
              rate: item.rate,
            })),
          ],
        },
      },
      include: { items: true },
    });
    await this.audit.record(actor, {
      action: 'JOB_CREATED',
      entityType: 'GridJob',
      entityId: job.id,
      companyId: job.companyId,
      after: {
        jobNumber,
        componentId: job.componentId,
        quantity: job.quantity,
        lines: additionalItems.length + 1,
      },
    });
    return job;
  }

  async update(actor: RequestUser, id: string, input: z.infer<typeof updateJobSchema>) {
    const before = await this.assertJobScope(actor, id);
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
  async recommendations(jobId: string, actor?: RequestUser): Promise<PartnerRecommendation[]> {
    const job = await this.prisma.gridJob.findUniqueOrThrow({
      where: { id: jobId },
      include: { component: true },
    });
    if (actor) assertCompanyScope(actor, job.companyId, 'job');
    const approved = await this.prisma.approvedPartnerComponent.findMany({
      where: { componentId: job.componentId, isActive: true },
      include: {
        partner: {
          include: {
            capabilities: true,
            rates: { where: { componentId: job.componentId, isActive: true } },
            kpis: { orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }], take: 12 },
          },
        },
      },
    });

    const componentHours = await this.capacity.estimatedHours(job.componentId, job.quantity);
    const candidateRates = approved.map(
      (link) => link.partner.rates[0]?.conversionRate ?? job.rate,
    );
    const bestRate = candidateRates.length > 0 ? Math.min(...candidateRates) : job.rate;

    // Module 5 — the ranking's "available capacity" factor reads what the partner actually
    // declared for the job's window and process. It used to read `Partner.maxCapacityHours`, a
    // static number on the master, so a declared shutdown never reached the score.
    const windowStart = job.plannedStartDate ?? new Date();
    const windowEnd = job.dueDate;
    const processId = await this.capacity.processForComponent(job.componentId);
    const partnerIds = approved.map((link) => link.partner.id);
    const declaredCapacity = processId
      ? await this.capacity.declaredCapacityForMany(partnerIds, processId, windowStart, windowEnd)
      : new Map<string, DeclaredCapacity>();

    // Concentration risk is measured inside the company that owns the job. Reading every company's
    // jobs both crossed the group boundary and loaded the whole table to produce one number.
    const [networkValueRows, openJobCounts] = await Promise.all([
      // Value is quantity x rate, which Prisma cannot sum, and loading every job to multiply them
      // in memory is what this replaces. Grouped in the database, one row per partner.
      this.prisma.$queryRaw<Array<{ partnerId: string | null; value: number }>>`
        SELECT "partnerId", COALESCE(SUM("quantity" * "rate"), 0)::double precision AS "value"
        FROM "GridJob"
        WHERE "companyId" = ${job.companyId} AND "status" <> 'CANCELLED'
        GROUP BY "partnerId"
      `,
      this.prisma.gridJob.groupBy({
        by: ['partnerId'],
        where: { partnerId: { in: partnerIds }, status: { notIn: ['CLOSED', 'CANCELLED'] } },
        _count: { _all: true },
      }),
    ]);

    const totalNetworkValue = networkValueRows.reduce((sum, row) => sum + Number(row.value), 0);
    const valueByPartner = new Map(
      networkValueRows.map((row) => [row.partnerId ?? '', Number(row.value)]),
    );
    const openJobsByPartner = new Map(
      openJobCounts.map((row) => [row.partnerId ?? '', row._count._all]),
    );

    const recommendations = approved.map((link) => {
      const partner = link.partner;
        const openJobs = openJobsByPartner.get(partner.id) ?? 0;
        const declared = declaredCapacity.get(partner.id);
        const capability = partner.capabilities.find(
          (item) => item.process === job.component.primaryProcess,
        );
        const rate = partner.rates[0]?.conversionRate ?? job.rate;
        // No declaration is not "unlimited": a partner who has not said what they can take should
        // not outrank one who has. Fall back to the capability's monthly figure, then to zero.
        const freeCapacityHours = declared?.hasDeclaration
          ? declared.freeHours
          : Math.max(0, (capability?.monthlyCapacityHours ?? 0) - (declared?.committedHours ?? 0));
        const onTimeDeliveryPercent =
          partner.kpis.find((kpi) => kpi.code === 'ON_TIME_IN_FULL_DELIVERY')?.value ?? 0;
        const firstPassQualityPercent =
          partner.kpis.find((kpi) => kpi.code === 'FIRST_PASS_QUALITY')?.value ?? 0;
        const partnerValue = valueByPartner.get(partner.id) ?? 0;

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
        if (processId && !declared?.hasDeclaration) {
          blockers.push('No capacity declared for this period — ask the partner to confirm');
        }

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
          capacityDeclared: Boolean(declared?.hasDeclaration),
          declaredHours: declared?.declaredHours ?? 0,
          committedHours: declared?.committedHours ?? 0,
          openJobs,
          onTimeDeliveryPercent,
          firstPassQualityPercent,
          conversionRate: rate,
          networkSharePercent: input.networkSharePercent,
        blockers,
        breakdown: score.breakdown,
      } satisfies PartnerRecommendation;
    });
    return recommendations.sort((a, b) => b.score - a.score);
  }

  async allocate(actor: RequestUser, id: string, input: z.infer<typeof allocateJobSchema>) {
    await this.assertJobScope(actor, id);
    const job = await this.prisma.gridJob.findUniqueOrThrow({
      where: { id },
      include: { component: true },
    });
    const partner = await this.prisma.partner.findUniqueOrThrow({
      where: { id: input.partnerId },
      include: { capabilities: true },
    });
    assertCompanyScope(actor, partner.companyId, 'partner');

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
    this.assertClassAAuthorised(
      actor,
      job.component.criticality,
      input.classAOverrideReason,
      'Allocating',
      job.classAOverrideById,
    );
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

    // Module 5 — the hours this job will consume, and the process it consumes them from, so the
    // reservation below lands on the right capacity declaration.
    const [reservedHours, processId] = await Promise.all([
      this.capacity.estimatedHours(job.componentId, job.quantity),
      this.capacity.processForComponent(job.componentId),
    ]);

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

      // Hold the partner's hours for the job window. Re-allocating replaces the previous hold,
      // so a job moved between partners never counts against both.
      if (processId && reservedHours > 0) {
        await this.capacity.reserve(
          {
            partnerId: partner.id,
            processId,
            jobId: id,
            hours: reservedHours,
            periodStart: job.plannedStartDate ?? new Date(),
            periodEnd: job.dueDate,
          },
          tx,
        );
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
      // A declined job goes back on the board and gives its reserved hours back to the partner.
      if (!input.accepted) await this.capacity.release(id, tx);

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

  /**
   * Section 2 — production started → first article approved → batch completed. Batch progress may
   * not be reported until a first-article inspection on this job has been accepted, so nobody can
   * run a batch on an unproven setup.
   *
   * Idempotent replays from the offline queue are handled before this runs: a milestone that was
   * legitimately accepted while online is never re-judged when its retry arrives.
   */
  private async assertFirstArticleCleared(
    jobId: string,
    milestoneType: MilestoneType,
  ): Promise<void> {
    if (!MILESTONES_REQUIRING_FIRST_ARTICLE.includes(milestoneType)) return;

    const job = await this.prisma.gridJob.findUniqueOrThrow({
      where: { id: jobId },
      include: { component: { select: { inspectionLevel: true, criticality: true } } },
    });
    if (!requiresFirstArticle(job.component.inspectionLevel, job.component.criticality)) return;

    const accepted = await this.prisma.inspection.findFirst({
      where: {
        jobId,
        type: 'FIRST_ARTICLE',
        status: 'COMPLETED',
        decision: { in: ['ACCEPTED', 'ACCEPTED_WITH_DEVIATION'] },
      },
      select: { id: true },
    });
    if (accepted) return;

    const pending = await this.prisma.inspection.findFirst({
      where: { jobId, type: 'FIRST_ARTICLE', status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      select: { id: true },
    });
    throw new BadRequestException(
      pending
        ? 'The first article for this job is still under inspection. Batch progress can be reported once it is accepted.'
        : 'Request a first-article inspection and have it accepted before reporting batch progress.',
    );
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

    await this.assertFirstArticleCleared(id, input.type);
    assertMilestoneEvidence(input.type, input.photographFileIds);

    // Module 3 — a partner may not report production against a revision they have not
    // acknowledged. Acknowledgement was recorded and read by nothing, which made the "acknowledge
    // before continuing production" line in the release notification an unenforced request.
    if (job.partnerId && PRODUCTION_MILESTONES.includes(input.type)) {
      await this.drawings.assertRevisionAcknowledged(
        job.partnerId,
        id,
        'reporting production progress',
      );
    }

    const milestone = await this.prisma.jobMilestone.create({
      data: {
        jobId: id,
        type: input.type,
        quantityCompleted: input.quantityCompleted,
        remarks: input.remarks,
        expectedCompletionDate: input.expectedCompletionDate,
        reportedById: actor.id,
        // Module 7 — when this step was due, so an overdue milestone can be found by comparing
        // against a date rather than only against the job's own due date.
        dueAt: milestoneDueAt(input.type, job.plannedStartDate, job.dueDate),
        isOverdue: job.dueDate < new Date(),
        syncedFromOffline: Boolean(input.clientRequestId),
        clientRequestId: input.clientRequestId,
      },
    });
    await this.files.attachPhotographs(input.photographFileIds, 'GridJob', id, input.type, {
      latitude: input.latitude,
      longitude: input.longitude,
    });

    if (input.delayReason) {
      await this.prisma.jobDelay.create({
        data: {
          jobId: id,
          reason: input.delayReason,
          // Module 7: the reason decides who owns the delay, not who reported it.
          responsibility: responsibilityForDelay(input.delayReason, job.materialResponsibility),
          detail: input.remarks,
          expectedCompletionDate: input.expectedCompletionDate,
          reportedById: actor.id,
        },
      });
    }

    if (input.type === 'PRODUCTION_STARTED' && job.status !== 'IN_PRODUCTION') {
      await this.transition(actor, id, 'IN_PRODUCTION', 'Production started by partner');
    }

    // §15 partner journey step 10 — a partner who sends the accepted quantity themselves moves the
    // job on. Without this the board only advances when OSWAR raises a shipment, so a partner drop
    // or their own courier leaves the job sitting in QUALITY_ACCEPTED with nobody looking at it.
    if (input.type === 'DISPATCHED' && job.status === 'QUALITY_ACCEPTED') {
      await this.transition(actor, id, 'DISPATCHED', 'Dispatched by partner');
      await this.notifications.notify({
        event: 'SHIPMENT_DISPATCHED',
        title: `${job.jobNumber} dispatched by the partner`,
        body: `${input.quantityCompleted ?? job.acceptedQuantity} nos on the way. Record receipt when it arrives.`,
        link: `/app/production/jobs/${id}`,
        entityType: 'GridJob',
        entityId: id,
        roleCodes: ['STORES_USER', 'LOGISTICS_COORDINATOR', 'OPERATIONS_HEAD'],
      });
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
    // A partner cannot assign responsibility — only an internal reviewer may override the default
    // the reason implies, otherwise the attribution the scorecard depends on is self-reported.
    const responsibility =
      actor.userType === 'PARTNER'
        ? responsibilityForDelay(input.reason, job.materialResponsibility)
        : (input.responsibility ??
          responsibilityForDelay(input.reason, job.materialResponsibility));

    const delay = await this.prisma.jobDelay.create({
      data: {
        jobId: id,
        reason: input.reason,
        responsibility,
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
    await this.assertJobScope(actor, id);
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
    // The work is done: hand the hours back so the partner shows as available again.
    await this.capacity.release(id);
    // §10 — the outsourced work-order status and actual completion date go back to IMS. Queued,
    // not awaited on success, so an IMS outage never blocks closing a job.
    await this.ims.pushInBackground('outsourced-work-order-status', id);
    await this.ims.pushInBackground('actual-completion-dates', id);
    await this.notifications.notify({
      event: 'JOB_CLOSED',
      title: `Job ${job.jobNumber} closed`,
      body: `${updated.receivedQuantity} nos received. Invoicing can proceed.`,
      link: `/partner/jobs/${id}`,
      entityType: 'GridJob',
      entityId: id,
      partnerId: job.partnerId ?? undefined,
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
    await this.assertJobScope(actor, id);
    const cancelled = await this.transition(actor, id, 'CANCELLED', reason);
    await this.capacity.release(id);
    return cancelled;
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

/**
 * Module 7 — milestones that mean the partner is building to the drawing, so acknowledgement of
 * the current revision must already be on record.
 *
 * Accepting the job and confirming material receipt are deliberately not here: a partner has to be
 * able to take a job and receive steel before they have opened the drawing.
 */
const PRODUCTION_MILESTONES: MilestoneType[] = [
  'PRODUCTION_STARTED',
  'FIRST_PIECE_READY',
  'BATCH_25_PERCENT',
  'BATCH_50_PERCENT',
  'BATCH_READY_FOR_INSPECTION',
  'DISPATCHED',
];

/**
 * When a milestone was due, spread across the job window.
 *
 * `JobMilestone.dueAt` was a column nothing wrote, so "milestone overdue" could only ever mean
 * "the whole job is late" — by which point the early warning the field exists to give has passed.
 * The fractions are the share of the window each step should be reached by.
 */
const MILESTONE_SCHEDULE: Record<MilestoneType, number> = {
  JOB_ACCEPTED: 0,
  MATERIAL_RECEIVED: 0.1,
  PRODUCTION_STARTED: 0.2,
  FIRST_PIECE_READY: 0.35,
  BATCH_25_PERCENT: 0.5,
  BATCH_50_PERCENT: 0.65,
  BATCH_READY_FOR_INSPECTION: 0.85,
  DISPATCHED: 1,
};

function milestoneDueAt(
  type: MilestoneType,
  plannedStart: Date | null,
  dueDate: Date,
): Date | null {
  const start = plannedStart ?? null;
  if (!start) return dueDate;
  const window = dueDate.getTime() - start.getTime();
  if (window <= 0) return dueDate;
  return new Date(start.getTime() + window * MILESTONE_SCHEDULE[type]);
}
