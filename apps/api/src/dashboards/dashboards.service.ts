import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@gridx/db';
import {
  FinanceDashboard,
  ManagementDashboard,
  OperationsDashboard,
  PartnerDashboard,
  PartnerScoreSummary,
  QualityDashboard,
} from '@gridx/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RequestUser } from '../common/request-user';
import { allowedCompanyIds, assertCompanyScope } from '../common/company-scope';
import { JOB_SUMMARY_INCLUDE, toJobSummary } from './job-summary';

const OPEN_JOB_STATUSES: Prisma.EnumJobStatusFilter = {
  notIn: ['DRAFT', 'CLOSED', 'CANCELLED'],
};

const OPEN_REWORK_STATUSES: Prisma.EnumReworkStatusFilter = {
  notIn: ['COMPLETED', 'SCRAPPED'],
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Company clauses for one dashboard request, resolved once and spread into every query. Each
 * field is the fragment for a different shape of model, so a caller never has to think about
 * how far the company sits from the record being counted (Section 4).
 */
interface DashboardScope {
  /** Models carrying companyId themselves: GridJob, MaterialIssue, PartnerInvoice, Shipment, Tool. */
  own: { companyId?: { in: string[] } };
  /** Partner, which carries companyId, used where the model *is* a partner. */
  partner: { companyId?: { in: string[] } };
  /** Records reached through a job — inspections, rework orders, reconciliations. */
  viaJob: { job?: { companyId: { in: string[] } } };
  /** Records reached through a partner — capacity declarations, scores, KPIs. */
  viaPartner: { partner?: { companyId: { in: string[] } } };
}

/** Module 14 — role-specific dashboards. All numbers come from live transactional data. */
@Injectable()
export class DashboardsService {
  constructor(private readonly prisma: PrismaService) {}

  private scopeFor(actor: RequestUser): DashboardScope {
    const ids = allowedCompanyIds(actor);
    if (!ids) return { own: {}, partner: {}, viaJob: {}, viaPartner: {} };
    return {
      own: { companyId: { in: ids } },
      partner: { companyId: { in: ids } },
      viaJob: { job: { companyId: { in: ids } } },
      viaPartner: { partner: { companyId: { in: ids } } },
    };
  }

  async management(actor: RequestUser): Promise<ManagementDashboard> {
    const scope = this.scopeFor(actor);
    const now = new Date();
    const [
      activePartners,
      jobsInProgress,
      openJobs,
      jobsByStatusRaw,
      scores,
      capacity,
      allocations,
      reconciliations,
      overduePayments,
      completedJobs,
    ] = await Promise.all([
      this.prisma.partner.count({
        where: {
          ...scope.partner,
          approvalStatus: { in: ['TRIAL_APPROVED', 'APPROVED', 'CERTIFIED', 'STRATEGIC'] },
        },
      }),
      this.prisma.gridJob.count({ where: { ...scope.own, status: OPEN_JOB_STATUSES } }),
      this.prisma.gridJob.findMany({
        where: { ...scope.own, status: OPEN_JOB_STATUSES },
        select: { id: true, quantity: true, rate: true, dueDate: true },
      }),
      this.prisma.gridJob.groupBy({ by: ['status'], where: scope.own, _count: { _all: true } }),
      this.prisma.partnerScore.findMany({
        where: scope.viaPartner,
        orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
        take: 100,
        include: { partner: { select: { partnerCode: true, businessName: true, city: true } } },
      }),
      this.prisma.capacityDeclaration.aggregate({
        where: { ...scope.viaPartner, periodEnd: { gte: now } },
        _sum: { availableHours: true, committedHours: true },
      }),
      this.prisma.capacityAllocation.aggregate({
        where: { ...scope.viaPartner, periodEnd: { gte: now } },
        _sum: { allocatedHours: true },
      }),
      this.prisma.materialReconciliation.aggregate({
        where: { ...scope.viaJob, status: 'PENDING' },
        _sum: { issuedKg: true, consumedKg: true },
      }),
      this.prisma.partnerInvoice.count({
        where: {
          ...scope.own,
          status: { in: ['FINANCE_APPROVED', 'PAYMENT_SCHEDULED'] },
          paymentScheduledFor: { lt: now },
        },
      }),
      this.prisma.gridJob.findMany({
        where: { ...scope.own, completedAt: { not: null } },
        select: {
          completedAt: true,
          dueDate: true,
          acceptedQuantity: true,
          rejectedQuantity: true,
          reworkQuantity: true,
          rate: true,
          quantity: true,
        },
      }),
    ]);

    const totalOutsourcedValue = openJobs.reduce((sum, job) => sum + job.quantity * job.rate, 0);
    const jobsAtRisk = openJobs.filter((job) => job.dueDate.getTime() < now.getTime() + 2 * DAY_MS)
      .length;

    const accepted = completedJobs.reduce((sum, job) => sum + job.acceptedQuantity, 0);
    const notAccepted = completedJobs.reduce(
      (sum, job) => sum + job.rejectedQuantity + job.reworkQuantity,
      0,
    );
    const qualityAcceptanceRate =
      accepted + notAccepted > 0 ? round2((accepted / (accepted + notAccepted)) * 100) : 0;
    const onTime = completedJobs.filter(
      (job) => job.completedAt && job.completedAt.getTime() <= job.dueDate.getTime(),
    ).length;
    const onTimeDeliveryRate =
      completedJobs.length > 0 ? round2((onTime / completedJobs.length) * 100) : 0;

    const availableHours = capacity._sum.availableHours ?? 0;
    const committedHours = Math.max(
      capacity._sum.committedHours ?? 0,
      allocations._sum.allocatedHours ?? 0,
    );

    const summaries: PartnerScoreSummary[] = dedupeLatestScores(scores);

    const custodyKg =
      (reconciliations._sum.issuedKg ?? 0) - (reconciliations._sum.consumedKg ?? 0);
    const custodyValue = await this.materialCustodyValue(scope);

    return {
      activePartners,
      jobsInProgress,
      jobsAtRisk,
      totalOutsourcedValue: round2(totalOutsourcedValue),
      costSavings: await this.costSavings(scope),
      avoidedCapex: round2(availableHours * 1200),
      qualityAcceptanceRate,
      onTimeDeliveryRate,
      totalNetworkCapacityHours: round2(availableHours),
      capacityUtilisationPercent:
        availableHours > 0 ? round2((committedHours / availableHours) * 100) : 0,
      topPartners: summaries.slice(0, 5),
      bottomPartners: [...summaries].reverse().slice(0, 5),
      materialUnderPartnerCustodyKg: round2(Math.max(0, custodyKg)),
      materialUnderPartnerCustodyValue: custodyValue,
      overduePayments,
      estimatedAdditionalCapacityHours: round2(Math.max(0, availableHours - committedHours)),
      jobsByStatus: jobsByStatusRaw.map((row) => ({ status: row.status, count: row._count._all })),
      monthlyTrend: await this.monthlyTrend(scope),
    };
  }

  async operations(actor: RequestUser): Promise<OperationsDashboard> {
    const scope = this.scopeFor(actor);
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + DAY_MS);

    const [dueToday, delayed, awaitingInspection, materialPending, escalations] = await Promise.all([
      this.prisma.gridJob.findMany({
        where: {
          ...scope.own,
          dueDate: { gte: startOfDay, lt: endOfDay },
          status: OPEN_JOB_STATUSES,
        },
        include: JOB_SUMMARY_INCLUDE,
        orderBy: { priority: 'desc' },
      }),
      this.prisma.gridJob.findMany({
        where: { ...scope.own, dueDate: { lt: startOfDay }, status: OPEN_JOB_STATUSES },
        include: JOB_SUMMARY_INCLUDE,
        orderBy: { dueDate: 'asc' },
        take: 50,
      }),
      this.prisma.gridJob.findMany({
        where: { ...scope.own, status: { in: ['INSPECTION_REQUESTED', 'UNDER_INSPECTION'] } },
        include: JOB_SUMMARY_INCLUDE,
        orderBy: { dueDate: 'asc' },
        take: 50,
      }),
      this.prisma.gridJob.findMany({
        where: { ...scope.own, status: { in: ['MATERIAL_PENDING', 'MATERIAL_ISSUED'] } },
        include: JOB_SUMMARY_INCLUDE,
        orderBy: { dueDate: 'asc' },
        take: 50,
      }),
      this.prisma.gridJob.findMany({
        where: {
          ...scope.own,
          status: OPEN_JOB_STATUSES,
          OR: [
            { priority: 'CRITICAL' },
            { delays: { some: { resolvedAt: null } } },
            { clarifications: { some: { answeredAt: null } } },
          ],
        },
        include: JOB_SUMMARY_INCLUDE,
        orderBy: { dueDate: 'asc' },
        take: 50,
      }),
    ]);

    const partners = await this.prisma.partner.findMany({
      where: {
        ...scope.partner,
        approvalStatus: { in: ['TRIAL_APPROVED', 'APPROVED', 'CERTIFIED', 'STRATEGIC'] },
      },
      select: {
        id: true,
        businessName: true,
        _count: { select: { jobs: { where: { status: OPEN_JOB_STATUSES } } } },
        capacityDeclarations: {
          where: { periodEnd: { gte: now } },
          select: { availableHours: true, committedHours: true },
        },
      },
    });

    const declarations = await this.prisma.capacityDeclaration.findMany({
      where: { ...scope.viaPartner, periodEnd: { gte: now } },
      include: { process: { select: { code: true } } },
    });

    const byProcess = new Map<string, { available: number; committed: number }>();
    for (const declaration of declarations) {
      const key = declaration.process.code;
      const current = byProcess.get(key) ?? { available: 0, committed: 0 };
      current.available += declaration.availableHours;
      current.committed += declaration.committedHours;
      byProcess.set(key, current);
    }

    return {
      dueToday: dueToday.map(toJobSummary),
      delayedJobs: delayed.map(toJobSummary),
      awaitingInspection: awaitingInspection.map(toJobSummary),
      materialPending: materialPending.map(toJobSummary),
      partnerWorkload: partners.map((partner) => {
        const available = partner.capacityDeclarations.reduce((s, d) => s + d.availableHours, 0);
        const committed = partner.capacityDeclarations.reduce((s, d) => s + d.committedHours, 0);
        return {
          partnerId: partner.id,
          businessName: partner.businessName,
          openJobs: partner._count.jobs,
          committedHours: round2(committed),
          availableHours: round2(available),
          utilisationPercent: available > 0 ? round2((committed / available) * 100) : 0,
        };
      }),
      capacityBottlenecks: [...byProcess.entries()]
        .map(([process, value]) => ({
          process: process as OperationsDashboard['capacityBottlenecks'][number]['process'],
          availableHours: round2(value.available),
          committedHours: round2(value.committed),
          utilisationPercent: value.available > 0 ? round2((value.committed / value.available) * 100) : 0,
        }))
        .sort((a, b) => b.utilisationPercent - a.utilisationPercent),
      escalations: escalations.map(toJobSummary),
    };
  }

  async quality(actor: RequestUser): Promise<QualityDashboard> {
    const scope = this.scopeFor(actor);
    const now = new Date();
    const [
      firstArticlesPending,
      completedInspections,
      reworkOrders,
      defects,
      openCorrectiveActions,
      inspectors,
    ] = await Promise.all([
      this.prisma.inspection.count({
        where: {
          ...scope.viaJob,
          type: 'FIRST_ARTICLE',
          status: { in: ['REQUESTED', 'ASSIGNED', 'IN_PROGRESS'] },
        },
      }),
      this.prisma.inspection.aggregate({
        where: { ...scope.viaJob, status: 'COMPLETED' },
        _sum: { acceptedQuantity: true, rejectedQuantity: true, reworkQuantity: true },
      }),
      this.prisma.reworkOrder.findMany({
        where: { ...scope.viaJob, status: OPEN_REWORK_STATUSES },
        select: { issuedAt: true },
      }),
      this.prisma.nonConformance.groupBy({
        by: ['defectType'],
        where: scope.viaJob,
        _count: { _all: true },
        orderBy: { _count: { defectType: 'desc' } },
        take: 8,
      }),
      this.prisma.correctiveAction.count({
        where: { nonConformance: scope.viaJob, stage: { not: 'CLOSED' } },
      }),
      this.prisma.user.findMany({
        where: { role: { code: 'QUALITY_INSPECTOR' } },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              inspectionsPerformed: { where: { status: { in: ['ASSIGNED', 'IN_PROGRESS'] } } },
            },
          },
        },
      }),
    ]);

    const accepted = completedInspections._sum.acceptedQuantity ?? 0;
    const rejected =
      (completedInspections._sum.rejectedQuantity ?? 0) +
      (completedInspections._sum.reworkQuantity ?? 0);

    const buckets = [
      { bucket: '0-2 days', max: 2 },
      { bucket: '3-7 days', max: 7 },
      { bucket: '8-14 days', max: 14 },
      { bucket: '15+ days', max: Number.POSITIVE_INFINITY },
    ];
    const reworkAgeingDays = buckets.map((bucket, index) => {
      const min = index === 0 ? 0 : buckets[index - 1].max;
      return {
        bucket: bucket.bucket,
        count: reworkOrders.filter((order) => {
          const age = (now.getTime() - order.issuedAt.getTime()) / DAY_MS;
          return age > min && age <= bucket.max;
        }).length,
      };
    });

    const repeatDefects = await Promise.all(
      defects.map(async (defect) => ({
        defectType: defect.defectType,
        count: defect._count._all,
        partners: (
          await this.prisma.nonConformance.groupBy({
            by: ['partnerId'],
            where: { ...scope.viaJob, defectType: defect.defectType },
          })
        ).length,
      })),
    );

    const partnerScores = await this.prisma.partnerKPI.findMany({
      where: { ...scope.viaPartner, code: 'FIRST_PASS_QUALITY' },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
      take: 50,
      include: { partner: { select: { id: true, businessName: true } } },
    });
    const seen = new Set<string>();
    const partnerQualityTrends = partnerScores
      .filter((kpi) => (seen.has(kpi.partnerId) ? false : seen.add(kpi.partnerId)))
      .map((kpi) => ({
        partnerId: kpi.partnerId,
        businessName: kpi.partner.businessName,
        firstPassQuality: kpi.value,
      }));

    return {
      firstArticlesPending,
      rejectionRate: accepted + rejected > 0 ? round2((rejected / (accepted + rejected)) * 100) : 0,
      reworkAgeingDays,
      repeatDefects,
      partnerQualityTrends,
      openCorrectiveActions,
      inspectionWorkload: inspectors.map((inspector) => ({
        inspectorId: inspector.id,
        name: inspector.name,
        pending: inspector._count.inspectionsPerformed,
      })),
    };
  }

  async finance(actor: RequestUser): Promise<FinanceDashboard> {
    const scope = this.scopeFor(actor);
    const now = new Date();
    const [pending, accepted, paymentsDue, deductions, reconciliationPending, invoices] =
      await Promise.all([
        this.prisma.partnerInvoice.aggregate({
          where: { ...scope.own, status: { notIn: ['PAID', 'REJECTED', 'DRAFT'] } },
          _count: { _all: true },
          _sum: { netAmount: true },
        }),
        this.prisma.gridJob.findMany({
          where: { ...scope.own, acceptedQuantity: { gt: 0 } },
          select: { acceptedQuantity: true, rate: true },
        }),
        this.prisma.partnerInvoice.count({
          where: {
            ...scope.own,
            status: { in: ['FINANCE_APPROVED', 'PAYMENT_SCHEDULED'] },
            OR: [{ paymentScheduledFor: { lte: now } }, { paymentScheduledFor: null }],
          },
        }),
        this.prisma.partnerDeduction.aggregate({
          where: scope.viaPartner,
          _sum: { amount: true },
        }),
        this.prisma.materialReconciliation.count({
          where: { ...scope.viaJob, status: 'PENDING' },
        }),
        this.prisma.partnerInvoice.findMany({
          where: { ...scope.own, status: { notIn: ['PAID', 'REJECTED'] } },
          select: {
            netAmount: true,
            invoiceDate: true,
            partnerId: true,
            partner: { select: { businessName: true } },
          },
        }),
      ]);

    const ageingBuckets = [
      { bucket: '0-15 days', max: 15 },
      { bucket: '16-30 days', max: 30 },
      { bucket: '31-60 days', max: 60 },
      { bucket: '60+ days', max: Number.POSITIVE_INFINITY },
    ];
    const invoiceAgeing = ageingBuckets.map((bucket, index) => {
      const min = index === 0 ? 0 : ageingBuckets[index - 1].max;
      const rows = invoices.filter((invoice) => {
        const age = (now.getTime() - invoice.invoiceDate.getTime()) / DAY_MS;
        return age > min && age <= bucket.max;
      });
      return {
        bucket: bucket.bucket,
        count: rows.length,
        value: round2(rows.reduce((sum, row) => sum + row.netAmount, 0)),
      };
    });

    const outstandingByPartner = new Map<string, { businessName: string; outstanding: number }>();
    for (const invoice of invoices) {
      const current = outstandingByPartner.get(invoice.partnerId) ?? {
        businessName: invoice.partner.businessName,
        outstanding: 0,
      };
      current.outstanding += invoice.netAmount;
      outstandingByPartner.set(invoice.partnerId, current);
    }

    return {
      invoicesPending: pending._count._all,
      invoicesPendingValue: round2(pending._sum.netAmount ?? 0),
      acceptedValue: round2(accepted.reduce((sum, job) => sum + job.acceptedQuantity * job.rate, 0)),
      paymentsDue,
      deductions: round2(deductions._sum.amount ?? 0),
      materialReconciliationPending: reconciliationPending,
      partnerOutstanding: [...outstandingByPartner.entries()]
        .map(([partnerId, value]) => ({
          partnerId,
          businessName: value.businessName,
          outstanding: round2(value.outstanding),
        }))
        .sort((a, b) => b.outstanding - a.outstanding)
        .slice(0, 10),
      costSavingsByCategory: await this.costSavingsByCategory(scope),
      invoiceAgeing,
    };
  }

  async partner(actor: RequestUser, partnerIdOverride?: string): Promise<PartnerDashboard> {
    const partnerId = actor.partnerId ?? partnerIdOverride;
    if (!partnerId) throw new BadRequestException('partnerId is required');

    const partner = await this.prisma.partner.findUniqueOrThrow({
      where: { id: partnerId },
      select: { id: true, businessName: true, category: true, currentScore: true, companyId: true },
    });
    // A planner may open any partner's board, but only inside their own companies.
    if (!actor.partnerId) assertCompanyScope(actor, partner.companyId, 'partner');

    const [newJobs, activeJobs, awaitingMaterialAck, pendingInspections, reworkOpen, invoices, jobs] =
      await Promise.all([
        this.prisma.gridJob.count({
          where: { partnerId, status: 'AWAITING_PARTNER_ACCEPTANCE' },
        }),
        this.prisma.gridJob.count({ where: { partnerId, status: OPEN_JOB_STATUSES } }),
        this.prisma.materialIssue.count({
          where: { job: { partnerId }, acknowledgements: { none: {} } },
        }),
        this.prisma.inspection.count({
          where: { job: { partnerId }, status: { in: ['REQUESTED', 'ASSIGNED', 'IN_PROGRESS'] } },
        }),
        this.prisma.reworkOrder.count({
          where: { job: { partnerId }, status: OPEN_REWORK_STATUSES },
        }),
        this.prisma.partnerInvoice.findMany({
          where: { partnerId, status: { notIn: ['PAID', 'REJECTED'] } },
          select: { netAmount: true, status: true },
        }),
        this.prisma.gridJob.findMany({
          where: { partnerId, status: OPEN_JOB_STATUSES },
          include: JOB_SUMMARY_INCLUDE,
          orderBy: { dueDate: 'asc' },
          take: 25,
        }),
      ]);

    return {
      partnerId: partner.id,
      businessName: partner.businessName,
      category: partner.category,
      score: partner.currentScore,
      newJobs,
      activeJobs,
      awaitingMaterialAck,
      pendingInspections,
      reworkOpen,
      invoicesPending: invoices.length,
      paymentsDue: round2(
        invoices
          .filter((invoice) => invoice.status === 'FINANCE_APPROVED' || invoice.status === 'PAYMENT_SCHEDULED')
          .reduce((sum, invoice) => sum + invoice.netAmount, 0),
      ),
      jobs: jobs.map(toJobSummary),
    };
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private async materialCustodyValue(scope: DashboardScope): Promise<number> {
    const issues = await this.prisma.materialIssueItem.findMany({
      where: {
        materialIssue: { ...scope.own, job: { status: OPEN_JOB_STATUSES } },
      },
      select: { issueWeightKg: true, item: { select: { standardRate: true } } },
    });
    return round2(
      issues.reduce((sum, row) => sum + row.issueWeightKg * (row.item.standardRate ?? 0), 0),
    );
  }

  /**
   * Saving = (component standard conversion rate − partner rate) × accepted quantity.
   * Components without a standard rate contribute nothing rather than a guessed number.
   */
  private async costSavings(scope: DashboardScope): Promise<number> {
    const jobs = await this.prisma.gridJob.findMany({
      where: { ...scope.own, acceptedQuantity: { gt: 0 } },
      select: {
        acceptedQuantity: true,
        rate: true,
        component: { select: { standardConversionRate: true } },
      },
    });
    return round2(
      jobs.reduce((sum, job) => {
        const standard = job.component.standardConversionRate ?? 0;
        if (standard <= 0) return sum;
        return sum + Math.max(0, standard - job.rate) * job.acceptedQuantity;
      }, 0),
    );
  }

  private async costSavingsByCategory(
    scope: DashboardScope,
  ): Promise<Array<{ category: string; savings: number }>> {
    const jobs = await this.prisma.gridJob.findMany({
      where: { ...scope.own, acceptedQuantity: { gt: 0 } },
      select: {
        acceptedQuantity: true,
        rate: true,
        component: { select: { criticality: true, standardConversionRate: true } },
      },
    });
    const map = new Map<string, number>();
    for (const job of jobs) {
      const standard = job.component.standardConversionRate ?? 0;
      if (standard <= 0) continue;
      const key = job.component.criticality.replace('CLASS_', 'Class ');
      map.set(key, (map.get(key) ?? 0) + Math.max(0, standard - job.rate) * job.acceptedQuantity);
    }
    return [...map.entries()].map(([category, savings]) => ({
      category,
      savings: round2(savings),
    }));
  }

  private async monthlyTrend(scope: DashboardScope): Promise<ManagementDashboard['monthlyTrend']> {
    const since = new Date();
    since.setMonth(since.getMonth() - 5, 1);
    since.setHours(0, 0, 0, 0);

    const jobs = await this.prisma.gridJob.findMany({
      where: { ...scope.own, createdAt: { gte: since } },
      select: {
        createdAt: true,
        completedAt: true,
        dueDate: true,
        quantity: true,
        rate: true,
        acceptedQuantity: true,
        rejectedQuantity: true,
        reworkQuantity: true,
      },
    });

    const months = new Map<
      string,
      { outsourcedValue: number; accepted: number; rejected: number; onTime: number; done: number }
    >();
    for (let index = 0; index < 6; index += 1) {
      const date = new Date(since);
      date.setMonth(since.getMonth() + index);
      months.set(monthKey(date), {
        outsourcedValue: 0,
        accepted: 0,
        rejected: 0,
        onTime: 0,
        done: 0,
      });
    }

    for (const job of jobs) {
      const bucket = months.get(monthKey(job.createdAt));
      if (!bucket) continue;
      bucket.outsourcedValue += job.quantity * job.rate;
      bucket.accepted += job.acceptedQuantity;
      bucket.rejected += job.rejectedQuantity + job.reworkQuantity;
      if (job.completedAt) {
        bucket.done += 1;
        if (job.completedAt.getTime() <= job.dueDate.getTime()) bucket.onTime += 1;
      }
    }

    return [...months.entries()].map(([month, value]) => ({
      month,
      outsourcedValue: round2(value.outsourcedValue),
      acceptanceRate:
        value.accepted + value.rejected > 0
          ? round2((value.accepted / (value.accepted + value.rejected)) * 100)
          : 0,
      otd: value.done > 0 ? round2((value.onTime / value.done) * 100) : 0,
    }));
  }
}

function dedupeLatestScores(
  scores: Array<{
    partnerId: string;
    totalScore: number;
    category: PartnerScoreSummary['category'];
    recommendation: PartnerScoreSummary['recommendation'];
    jobsCompleted: number;
    partner: { partnerCode: string; businessName: string; city: string };
  }>,
): PartnerScoreSummary[] {
  const seen = new Set<string>();
  return scores
    .filter((score) => (seen.has(score.partnerId) ? false : seen.add(score.partnerId)))
    .map((score) => ({
      partnerId: score.partnerId,
      partnerCode: score.partner.partnerCode,
      businessName: score.partner.businessName,
      city: score.partner.city,
      score: score.totalScore,
      category: score.category,
      recommendation: score.recommendation,
      jobsCompleted: score.jobsCompleted,
    }))
    .sort((a, b) => b.score - a.score);
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
