import { ForbiddenException, Injectable } from '@nestjs/common';
import { KpiCode } from '@gridx/db';
import {
  KPI_WEIGHTS,
  KpiInput,
  categoryForScore,
  computeScorecard,
  recommendationForCategory,
} from '@gridx/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RequestUser } from '../common/request-user';

interface Period {
  periodMonth: number;
  periodYear: number;
}

/**
 * Module 12 — monthly partner scorecards. Every KPI is derived from transactional data
 * so a score can always be traced back to jobs, inspections and reconciliations.
 */
@Injectable()
export class ScorecardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(actor: RequestUser, period?: Partial<Period>) {
    return this.prisma.partnerScore.findMany({
      where: {
        ...(actor.partnerId ? { partnerId: actor.partnerId } : {}),
        ...(period?.periodMonth ? { periodMonth: period.periodMonth } : {}),
        ...(period?.periodYear ? { periodYear: period.periodYear } : {}),
      },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }, { totalScore: 'desc' }],
      include: {
        kpis: true,
        partner: { select: { id: true, businessName: true, city: true, category: true } },
      },
    });
  }

  async forPartner(actor: RequestUser, partnerId: string) {
    if (actor.partnerId && actor.partnerId !== partnerId) {
      throw new ForbiddenException('Partners can only view their own scorecard');
    }
    return this.prisma.partnerScore.findMany({
      where: { partnerId },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
      take: 12,
      include: { kpis: true },
    });
  }

  /** Recomputes and stores the scorecard for one partner, or every active partner. */
  async compute(actor: RequestUser, input: Period & { partnerId?: string }) {
    const partners = await this.prisma.partner.findMany({
      where: {
        ...(input.partnerId ? { id: input.partnerId } : {}),
        approvalStatus: { in: ['TRIAL_APPROVED', 'APPROVED', 'CERTIFIED', 'STRATEGIC'] },
      },
      select: { id: true, businessName: true },
    });
    const results = [];
    for (const partner of partners) {
      results.push(await this.computeForPartner(actor, partner.id, input));
    }
    return results;
  }

  private async computeForPartner(actor: RequestUser, partnerId: string, period: Period) {
    const periodStart = new Date(Date.UTC(period.periodYear, period.periodMonth - 1, 1));
    const periodEnd = new Date(Date.UTC(period.periodYear, period.periodMonth, 1));

    const jobs = await this.prisma.gridJob.findMany({
      where: {
        partnerId,
        OR: [
          { completedAt: { gte: periodStart, lt: periodEnd } },
          { closedAt: { gte: periodStart, lt: periodEnd } },
        ],
      },
      include: { milestones: true, reconciliations: true, inspections: true },
    });

    const jobsCompleted = jobs.length;
    const jobsOnTime = jobs.filter(
      (job) => job.completedAt && job.completedAt.getTime() <= job.dueDate.getTime(),
    ).length;
    const quantityAccepted = jobs.reduce((sum, job) => sum + job.acceptedQuantity, 0);
    const quantityRejected = jobs.reduce(
      (sum, job) => sum + job.rejectedQuantity + job.reworkQuantity,
      0,
    );

    const offered = quantityAccepted + quantityRejected;
    const firstPassQuality = offered > 0 ? (quantityAccepted / offered) * 100 : 100;
    const otif = jobsCompleted > 0 ? (jobsOnTime / jobsCompleted) * 100 : 100;

    const reconciliations = jobs.flatMap((job) => job.reconciliations);
    const issuedKg = reconciliations.reduce((sum, row) => sum + row.issuedKg, 0);
    const shortageKg = reconciliations.reduce((sum, row) => sum + row.shortageKg, 0);
    const materialUtilisation = issuedKg > 0 ? ((issuedKg - shortageKg) / issuedKg) * 100 : 100;

    const reworkOrders = await this.prisma.reworkOrder.findMany({
      where: { job: { partnerId }, issuedAt: { gte: periodStart, lt: periodEnd } },
    });
    const reworkClosedInTime = reworkOrders.filter(
      (order) =>
        order.completedAt && (!order.dueDate || order.completedAt.getTime() <= order.dueDate.getTime()),
    ).length;
    const reworkResponse =
      reworkOrders.length > 0 ? (reworkClosedInTime / reworkOrders.length) * 100 : 100;

    const declarations = await this.prisma.capacityDeclaration.count({
      where: { partnerId, periodStart: { gte: periodStart, lt: periodEnd } },
    });
    const declinedJobs = await this.prisma.gridJob.count({
      where: { partnerId, declinedAt: { gte: periodStart, lt: periodEnd } },
    });
    const offeredJobs = jobsCompleted + declinedJobs;
    const acceptanceReliability = offeredJobs > 0 ? (jobsCompleted / offeredJobs) * 100 : 100;
    const capacityReliability = Math.min(
      100,
      acceptanceReliability * (declarations > 0 ? 1 : 0.8),
    );

    const expectedMilestones = jobsCompleted * 4;
    const reportedMilestones = jobs.reduce((sum, job) => sum + job.milestones.length, 0);
    const documentationDiscipline =
      expectedMilestones > 0
        ? Math.min(100, (reportedMilestones / expectedMilestones) * 100)
        : 100;

    const documents = await this.prisma.partnerDocument.findMany({ where: { partnerId } });
    const compliantDocuments = documents.filter(
      (doc) => doc.verified && (!doc.expiryDate || doc.expiryDate.getTime() >= periodEnd.getTime()),
    ).length;
    const safetyAndCompliance =
      documents.length > 0 ? (compliantDocuments / documents.length) * 100 : 100;

    const openCriticalNcs = await this.prisma.nonConformance.count({
      where: {
        partnerId,
        raisedAt: { gte: periodStart, lt: periodEnd },
        closedAt: null,
        customerImpact: { not: null },
      },
    });

    const kpiInputs: KpiInput[] = [
      { code: 'FIRST_PASS_QUALITY', value: firstPassQuality },
      { code: 'ON_TIME_IN_FULL_DELIVERY', value: otif },
      { code: 'MATERIAL_UTILISATION', value: materialUtilisation },
      { code: 'REWORK_RESPONSE', value: reworkResponse },
      { code: 'CAPACITY_RELIABILITY', value: capacityReliability },
      { code: 'DOCUMENTATION_DISCIPLINE', value: documentationDiscipline },
      { code: 'SAFETY_AND_COMPLIANCE', value: safetyAndCompliance },
    ];

    const result = computeScorecard(kpiInputs, openCriticalNcs > 2);

    const score = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.partnerScore.upsert({
        where: {
          partnerId_periodYear_periodMonth: {
            partnerId,
            periodYear: period.periodYear,
            periodMonth: period.periodMonth,
          },
        },
        create: {
          partnerId,
          periodMonth: period.periodMonth,
          periodYear: period.periodYear,
          totalScore: result.totalScore,
          category: result.category,
          recommendation: result.recommendation,
          jobsCompleted,
          jobsOnTime,
          quantityAccepted,
          quantityRejected,
        },
        update: {
          totalScore: result.totalScore,
          category: result.category,
          recommendation: result.recommendation,
          jobsCompleted,
          jobsOnTime,
          quantityAccepted,
          quantityRejected,
          computedAt: new Date(),
        },
      });
      await tx.partnerKPI.deleteMany({ where: { scoreId: saved.id } });
      await tx.partnerKPI.createMany({
        data: result.kpis.map((kpi) => ({
          partnerId,
          scoreId: saved.id,
          code: kpi.code as KpiCode,
          weight: kpi.weight,
          value: kpi.value,
          weighted: kpi.weighted,
          periodMonth: period.periodMonth,
          periodYear: period.periodYear,
        })),
      });
      await tx.partner.update({
        where: { id: partnerId },
        data: { category: result.category, currentScore: result.totalScore },
      });
      return saved;
    });

    await this.notifications.notify({
      event: 'SCORECARD_PUBLISHED',
      title: `Scorecard published — ${result.totalScore}/100 (Category ${result.category})`,
      body: `Period ${period.periodMonth}/${period.periodYear}. Recommendation: ${result.recommendation}.`,
      link: '/partner/scorecard',
      entityType: 'PartnerScore',
      entityId: score.id,
      partnerId,
    });
    await this.audit.record(actor, {
      action: 'SCORECARD_COMPUTED',
      entityType: 'PartnerScore',
      entityId: score.id,
      after: {
        totalScore: result.totalScore,
        category: result.category,
        period: `${period.periodMonth}/${period.periodYear}`,
      },
    });

    return { ...score, kpis: result.kpis };
  }

  /** Network view used by the management dashboard: category mix and ranking. */
  async leaderboard(period: Period) {
    const scores = await this.prisma.partnerScore.findMany({
      where: { periodMonth: period.periodMonth, periodYear: period.periodYear },
      orderBy: { totalScore: 'desc' },
      include: { partner: { select: { id: true, businessName: true, city: true } } },
    });
    const mix = scores.reduce<Record<string, number>>((acc, score) => {
      acc[score.category] = (acc[score.category] ?? 0) + 1;
      return acc;
    }, {});
    return {
      weights: KPI_WEIGHTS,
      categoryMix: mix,
      averageScore:
        scores.length > 0
          ? Math.round((scores.reduce((sum, s) => sum + s.totalScore, 0) / scores.length) * 100) / 100
          : 0,
      rows: scores.map((score, index) => ({
        rank: index + 1,
        partnerId: score.partnerId,
        partnerName: score.partner.businessName,
        city: score.partner.city,
        totalScore: score.totalScore,
        category: score.category,
        recommendation: score.recommendation,
        jobsCompleted: score.jobsCompleted,
        jobsOnTime: score.jobsOnTime,
      })),
    };
  }

  /** Preview a score without persisting it — used for what-if reviews. */
  previewCategory(score: number, criticalViolation = false) {
    const category = categoryForScore(score, criticalViolation);
    return { category, recommendation: recommendationForCategory(category) };
  }
}
