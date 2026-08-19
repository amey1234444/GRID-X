import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@gridx/db';
import { PrismaService } from '../prisma/prisma.service';
import { RequestUser } from '../common/request-user';
import { allowedCompanyIds } from '../common/company-scope';

export type ReportRowValue = string | number | boolean | null;
export type ReportRow = Record<string, ReportRowValue>;

export interface ReportColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'currency';
}

export interface ReportResult {
  key: string;
  title: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  generatedAt: string;
}

export interface ReportFilters {
  from?: Date;
  to?: Date;
  partnerId?: string;
  componentId?: string;
  /**
   * Companies the caller may see (Section 4). Resolved once in `run()` and threaded through every
   * builder; `undefined` means unrestricted, which is Group Admin and partner users — the latter
   * are already narrowed to their own partnerId.
   */
  companyIds?: string[];
}

/** Section 21 — the full catalogue of reports GRID-X must provide. */
export const REPORT_DEFINITIONS = [
  { key: 'jobs-by-status', title: 'Jobs by status' },
  { key: 'jobs-by-partner', title: 'Jobs by partner' },
  { key: 'overdue-jobs', title: 'Overdue jobs' },
  { key: 'partner-rejection', title: 'Partner-wise rejection' },
  { key: 'component-rejection', title: 'Component-wise rejection' },
  { key: 'material-reconciliation', title: 'Material reconciliation' },
  { key: 'partner-capacity', title: 'Partner capacity' },
  { key: 'partner-scorecard', title: 'Partner scorecard' },
  { key: 'invoice-ageing', title: 'Invoice ageing' },
  { key: 'payment-ageing', title: 'Payment ageing' },
  { key: 'outsourcing-vs-internal', title: 'Outsourcing cost versus internal cost' },
  { key: 'logistics-cost', title: 'Logistics cost' },
  { key: 'rework-cost', title: 'Rework cost' },
  { key: 'avoided-capex', title: 'Avoided capex' },
  { key: 'capacity-added', title: 'Production capacity added' },
  { key: 'partner-concentration', title: 'Partner concentration' },
  { key: 'drawing-access-audit', title: 'Drawing-access audit' },
] as const;

export type ReportKey = (typeof REPORT_DEFINITIONS)[number]['key'];

const DAY_MS = 24 * 60 * 60 * 1000;

function ageInDays(from: Date, to: Date = new Date()): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / DAY_MS));
}

function bucket(days: number): string {
  if (days <= 15) return '0-15 days';
  if (days <= 30) return '16-30 days';
  if (days <= 45) return '31-45 days';
  if (days <= 60) return '46-60 days';
  return '60+ days';
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  catalogue(): { key: string; title: string }[] {
    return REPORT_DEFINITIONS.map((definition) => ({ ...definition }));
  }

  async run(actor: RequestUser, key: string, filters: ReportFilters): Promise<ReportResult> {
    const definition = REPORT_DEFINITIONS.find((item) => item.key === key);
    if (!definition) {
      throw new BadRequestException(`Unknown report: ${key}`);
    }
    // Partner users may only ever see their own slice of any report; internal users only ever see
    // the companies they are linked to.
    const scoped: ReportFilters = {
      ...filters,
      ...(actor.partnerId ? { partnerId: actor.partnerId } : {}),
      companyIds: allowedCompanyIds(actor) ?? undefined,
    };

    const { columns, rows } = await this.build(definition.key, scoped);
    return {
      key: definition.key,
      title: definition.title,
      columns,
      rows,
      generatedAt: new Date().toISOString(),
    };
  }

  toCsv(result: ReportResult): string {
    const header = result.columns.map((column) => column.label).join(',');
    const lines = result.rows.map((row) =>
      result.columns
        .map((column) => {
          const value = row[column.key];
          if (value === null || value === undefined) return '';
          const text = String(value);
          return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(','),
    );
    return [header, ...lines].join('\n');
  }

  /** Company clause for a model that carries companyId itself. */
  private company(filters: ReportFilters): { companyId?: { in: string[] } } {
    return filters.companyIds ? { companyId: { in: filters.companyIds } } : {};
  }

  /** Company clause reached through a named relation, e.g. `job` or `partner`. */
  private companyVia<K extends string>(
    filters: ReportFilters,
    relation: K,
  ): Record<K, { companyId: { in: string[] } }> | Record<string, never> {
    return filters.companyIds
      ? ({ [relation]: { companyId: { in: filters.companyIds } } } as Record<
          K,
          { companyId: { in: string[] } }
        >)
      : {};
  }

  private jobWhere(filters: ReportFilters): Prisma.GridJobWhereInput {
    return {
      ...this.company(filters),
      ...(filters.partnerId ? { partnerId: filters.partnerId } : {}),
      ...(filters.componentId ? { componentId: filters.componentId } : {}),
      ...(filters.from || filters.to
        ? { createdAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } }
        : {}),
    };
  }

  private async build(
    key: ReportKey,
    filters: ReportFilters,
  ): Promise<{ columns: ReportColumn[]; rows: ReportRow[] }> {
    switch (key) {
      case 'jobs-by-status':
        return this.jobsByStatus(filters);
      case 'jobs-by-partner':
        return this.jobsByPartner(filters);
      case 'overdue-jobs':
        return this.overdueJobs(filters);
      case 'partner-rejection':
        return this.partnerRejection(filters);
      case 'component-rejection':
        return this.componentRejection(filters);
      case 'material-reconciliation':
        return this.materialReconciliation(filters);
      case 'partner-capacity':
        return this.partnerCapacity(filters);
      case 'partner-scorecard':
        return this.partnerScorecard(filters);
      case 'invoice-ageing':
        return this.invoiceAgeing(filters);
      case 'payment-ageing':
        return this.paymentAgeing(filters);
      case 'outsourcing-vs-internal':
        return this.outsourcingVsInternal(filters);
      case 'logistics-cost':
        return this.logisticsCost(filters);
      case 'rework-cost':
        return this.reworkCost(filters);
      case 'avoided-capex':
        return this.avoidedCapex(filters);
      case 'capacity-added':
        return this.capacityAdded(filters);
      case 'partner-concentration':
        return this.partnerConcentration(filters);
      case 'drawing-access-audit':
        return this.drawingAccessAudit(filters);
      default:
        throw new BadRequestException(`Unknown report: ${key}`);
    }
  }

  private async jobsByStatus(filters: ReportFilters) {
    const grouped = await this.prisma.gridJob.groupBy({
      by: ['status'],
      where: this.jobWhere(filters),
      _count: { _all: true },
      _sum: { quantity: true, acceptedQuantity: true, rejectedQuantity: true },
    });
    return {
      columns: [
        { key: 'status', label: 'Status', type: 'text' as const },
        { key: 'jobs', label: 'Jobs', type: 'number' as const },
        { key: 'quantity', label: 'Quantity', type: 'number' as const },
        { key: 'accepted', label: 'Accepted', type: 'number' as const },
        { key: 'rejected', label: 'Rejected', type: 'number' as const },
      ],
      rows: grouped.map((row) => ({
        status: row.status,
        jobs: row._count._all,
        quantity: round(row._sum.quantity ?? 0),
        accepted: round(row._sum.acceptedQuantity ?? 0),
        rejected: round(row._sum.rejectedQuantity ?? 0),
      })),
    };
  }

  private async jobsByPartner(filters: ReportFilters) {
    const jobs = await this.prisma.gridJob.findMany({
      where: { ...this.jobWhere(filters), partnerId: { not: null } },
      select: {
        partnerId: true,
        quantity: true,
        acceptedQuantity: true,
        rejectedQuantity: true,
        rate: true,
        status: true,
        dueDate: true,
        closedAt: true,
        partner: { select: { businessName: true } },
      },
    });
    const map = new Map<string, ReportRow & { jobs: number }>();
    for (const job of jobs) {
      const id = job.partnerId as string;
      const current = map.get(id) ?? {
        partnerName: job.partner?.businessName ?? id,
        jobs: 0,
        quantity: 0,
        accepted: 0,
        rejected: 0,
        value: 0,
        onTime: 0,
        closed: 0,
      };
      current.jobs += 1;
      current.quantity = Number(current.quantity) + job.quantity;
      current.accepted = Number(current.accepted) + job.acceptedQuantity;
      current.rejected = Number(current.rejected) + job.rejectedQuantity;
      current.value = Number(current.value) + job.rate * job.quantity;
      if (job.closedAt) {
        current.closed = Number(current.closed) + 1;
        if (job.closedAt <= job.dueDate) current.onTime = Number(current.onTime) + 1;
      }
      map.set(id, current);
    }
    return {
      columns: [
        { key: 'partnerName', label: 'Partner', type: 'text' as const },
        { key: 'jobs', label: 'Jobs', type: 'number' as const },
        { key: 'quantity', label: 'Quantity', type: 'number' as const },
        { key: 'accepted', label: 'Accepted', type: 'number' as const },
        { key: 'rejected', label: 'Rejected', type: 'number' as const },
        { key: 'value', label: 'Conversion value', type: 'currency' as const },
        { key: 'onTimePercent', label: 'On-time %', type: 'number' as const },
      ],
      rows: [...map.values()].map((row) => ({
        ...row,
        quantity: round(Number(row.quantity)),
        accepted: round(Number(row.accepted)),
        rejected: round(Number(row.rejected)),
        value: round(Number(row.value)),
        onTimePercent:
          Number(row.closed) > 0 ? round((Number(row.onTime) / Number(row.closed)) * 100, 1) : 0,
      })),
    };
  }

  private async overdueJobs(filters: ReportFilters) {
    const jobs = await this.prisma.gridJob.findMany({
      where: {
        ...this.jobWhere(filters),
        dueDate: { lt: new Date() },
        status: { notIn: ['DRAFT', 'CLOSED', 'CANCELLED'] },
      },
      orderBy: { dueDate: 'asc' },
      select: {
        jobNumber: true,
        status: true,
        quantity: true,
        acceptedQuantity: true,
        dueDate: true,
        priority: true,
        partner: { select: { businessName: true } },
        component: { select: { componentCode: true, name: true } },
      },
    });
    return {
      columns: [
        { key: 'jobNumber', label: 'Job', type: 'text' as const },
        { key: 'partnerName', label: 'Partner', type: 'text' as const },
        { key: 'component', label: 'Component', type: 'text' as const },
        { key: 'status', label: 'Status', type: 'text' as const },
        { key: 'priority', label: 'Priority', type: 'text' as const },
        { key: 'dueDate', label: 'Due date', type: 'date' as const },
        { key: 'delayDays', label: 'Delay (days)', type: 'number' as const },
        { key: 'pending', label: 'Pending qty', type: 'number' as const },
      ],
      rows: jobs.map((job) => ({
        jobNumber: job.jobNumber,
        partnerName: job.partner?.businessName ?? 'Unallocated',
        component: `${job.component.componentCode} — ${job.component.name}`,
        status: job.status,
        priority: job.priority,
        dueDate: job.dueDate.toISOString(),
        delayDays: ageInDays(job.dueDate),
        pending: round(job.quantity - job.acceptedQuantity),
      })),
    };
  }

  private async partnerRejection(filters: ReportFilters) {
    const grouped = await this.prisma.gridJob.groupBy({
      by: ['partnerId'],
      where: { ...this.jobWhere(filters), partnerId: { not: null } },
      _sum: { quantity: true, acceptedQuantity: true, rejectedQuantity: true, reworkQuantity: true },
    });
    const partners = await this.prisma.partner.findMany({
      where: { id: { in: grouped.map((row) => row.partnerId as string) } },
      select: { id: true, businessName: true },
    });
    const names = new Map(partners.map((partner) => [partner.id, partner.businessName]));
    return {
      columns: [
        { key: 'partnerName', label: 'Partner', type: 'text' as const },
        { key: 'quantity', label: 'Quantity', type: 'number' as const },
        { key: 'rejected', label: 'Rejected', type: 'number' as const },
        { key: 'rework', label: 'Rework', type: 'number' as const },
        { key: 'rejectionPercent', label: 'Rejection %', type: 'number' as const },
      ],
      rows: grouped.map((row) => {
        const quantity = row._sum.quantity ?? 0;
        const rejected = row._sum.rejectedQuantity ?? 0;
        return {
          partnerName: names.get(row.partnerId as string) ?? (row.partnerId as string),
          quantity: round(quantity),
          rejected: round(rejected),
          rework: round(row._sum.reworkQuantity ?? 0),
          rejectionPercent: quantity > 0 ? round((rejected / quantity) * 100, 2) : 0,
        };
      }),
    };
  }

  private async componentRejection(filters: ReportFilters) {
    const grouped = await this.prisma.gridJob.groupBy({
      by: ['componentId'],
      where: this.jobWhere(filters),
      _sum: { quantity: true, rejectedQuantity: true, reworkQuantity: true },
    });
    const components = await this.prisma.component.findMany({
      where: { id: { in: grouped.map((row) => row.componentId) } },
      select: { id: true, componentCode: true, name: true, criticality: true },
    });
    const byId = new Map(components.map((component) => [component.id, component]));
    return {
      columns: [
        { key: 'component', label: 'Component', type: 'text' as const },
        { key: 'criticality', label: 'Criticality', type: 'text' as const },
        { key: 'quantity', label: 'Quantity', type: 'number' as const },
        { key: 'rejected', label: 'Rejected', type: 'number' as const },
        { key: 'rejectionPercent', label: 'Rejection %', type: 'number' as const },
      ],
      rows: grouped.map((row) => {
        const component = byId.get(row.componentId);
        const quantity = row._sum.quantity ?? 0;
        const rejected = row._sum.rejectedQuantity ?? 0;
        return {
          component: component ? `${component.componentCode} — ${component.name}` : row.componentId,
          criticality: component?.criticality ?? null,
          quantity: round(quantity),
          rejected: round(rejected),
          rejectionPercent: quantity > 0 ? round((rejected / quantity) * 100, 2) : 0,
        };
      }),
    };
  }

  private async materialReconciliation(filters: ReportFilters) {
    const rows = await this.prisma.materialReconciliation.findMany({
      where: {
        ...this.companyVia(filters, 'job'),
        ...(filters.partnerId ? { job: { partnerId: filters.partnerId } } : {}),
        ...(filters.from || filters.to
          ? {
              createdAt: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {}),
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        issuedKg: true,
        consumedKg: true,
        scrapReturnedKg: true,
        unusedReturnedKg: true,
        shortageKg: true,
        excessKg: true,
        status: true,
        deductionAmount: true,
        item: { select: { code: true, name: true } },
        job: { select: { jobNumber: true, partner: { select: { businessName: true } } } },
      },
    });
    return {
      columns: [
        { key: 'jobNumber', label: 'Job', type: 'text' as const },
        { key: 'partnerName', label: 'Partner', type: 'text' as const },
        { key: 'item', label: 'Item', type: 'text' as const },
        { key: 'issuedKg', label: 'Issued (kg)', type: 'number' as const },
        { key: 'consumedKg', label: 'Consumed (kg)', type: 'number' as const },
        { key: 'scrapReturnedKg', label: 'Scrap returned (kg)', type: 'number' as const },
        { key: 'unusedReturnedKg', label: 'Unused returned (kg)', type: 'number' as const },
        { key: 'shortageKg', label: 'Shortage (kg)', type: 'number' as const },
        { key: 'excessKg', label: 'Excess (kg)', type: 'number' as const },
        { key: 'deductionAmount', label: 'Deduction', type: 'currency' as const },
        { key: 'status', label: 'Status', type: 'text' as const },
      ],
      rows: rows.map((row) => ({
        jobNumber: row.job.jobNumber,
        partnerName: row.job.partner?.businessName ?? null,
        item: `${row.item.code} — ${row.item.name}`,
        issuedKg: round(row.issuedKg, 3),
        consumedKg: round(row.consumedKg, 3),
        scrapReturnedKg: round(row.scrapReturnedKg, 3),
        unusedReturnedKg: round(row.unusedReturnedKg, 3),
        shortageKg: round(row.shortageKg, 3),
        excessKg: round(row.excessKg, 3),
        deductionAmount: round(row.deductionAmount),
        status: row.status,
      })),
    };
  }

  private async partnerCapacity(filters: ReportFilters) {
    const declarations = await this.prisma.capacityDeclaration.findMany({
      where: {
        ...this.companyVia(filters, 'partner'),
        ...(filters.partnerId ? { partnerId: filters.partnerId } : {}),
        ...(filters.from || filters.to
          ? {
              periodStart: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {}),
              },
            }
          : {}),
      },
      orderBy: { periodStart: 'desc' },
      select: {
        periodStart: true,
        periodEnd: true,
        availableHours: true,
        committedHours: true,
        maintenanceShutdownHours: true,
        availableWorkers: true,
        availableMachines: true,
        expectedBottleneck: true,
        partner: { select: { businessName: true } },
        process: { select: { code: true, name: true } },
        // GRID-X jobs hold capacity through reservations, so the report has to add them to the
        // hours the partner declared as already committed — same arithmetic as the heatmap.
        allocations: {
          where: { OR: [{ jobId: null }, { job: { status: { notIn: ['CLOSED', 'CANCELLED'] } } }] },
          select: { allocatedHours: true },
        },
      },
    });
    return {
      columns: [
        { key: 'partnerName', label: 'Partner', type: 'text' as const },
        { key: 'process', label: 'Process', type: 'text' as const },
        { key: 'periodStart', label: 'Period start', type: 'date' as const },
        { key: 'periodEnd', label: 'Period end', type: 'date' as const },
        { key: 'availableHours', label: 'Available hours', type: 'number' as const },
        { key: 'committedHours', label: 'Committed hours', type: 'number' as const },
        { key: 'freeHours', label: 'Free hours', type: 'number' as const },
        { key: 'utilisationPercent', label: 'Utilisation %', type: 'number' as const },
        { key: 'workers', label: 'Workers', type: 'number' as const },
        { key: 'machines', label: 'Machines', type: 'number' as const },
        { key: 'bottleneck', label: 'Expected bottleneck', type: 'text' as const },
      ],
      rows: declarations.map((row) => {
        // `availableHours` is already net of the maintenance shutdown — CapacityService.declare
        // subtracts it before storing — so it must not be subtracted a second time here.
        const net = Math.max(0, row.availableHours);
        const committed = row.allocations.reduce(
          (sum, allocation) => sum + allocation.allocatedHours,
          row.committedHours,
        );
        return {
          partnerName: row.partner.businessName,
          process: `${row.process.code} — ${row.process.name}`,
          periodStart: row.periodStart.toISOString(),
          periodEnd: row.periodEnd.toISOString(),
          availableHours: round(net),
          committedHours: round(committed),
          freeHours: round(Math.max(0, net - committed)),
          utilisationPercent: net > 0 ? round((committed / net) * 100, 1) : 0,
          workers: row.availableWorkers,
          machines: row.availableMachines,
          bottleneck: row.expectedBottleneck ?? null,
        };
      }),
    };
  }

  private async partnerScorecard(filters: ReportFilters) {
    const scores = await this.prisma.partnerScore.findMany({
      where: {
        ...this.companyVia(filters, 'partner'),
        ...(filters.partnerId ? { partnerId: filters.partnerId } : {}),
      },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }, { totalScore: 'desc' }],
      take: 500,
      include: { partner: { select: { businessName: true } }, kpis: true },
    });
    const kpiColumns: ReportColumn[] = [
      { key: 'FIRST_PASS_QUALITY', label: 'First-pass quality', type: 'number' },
      { key: 'ON_TIME_IN_FULL_DELIVERY', label: 'On-time in-full delivery', type: 'number' },
      { key: 'MATERIAL_UTILISATION', label: 'Material utilisation', type: 'number' },
      { key: 'REWORK_RESPONSE', label: 'Rework response', type: 'number' },
      { key: 'CAPACITY_RELIABILITY', label: 'Capacity reliability', type: 'number' },
      { key: 'DOCUMENTATION_DISCIPLINE', label: 'Documentation discipline', type: 'number' },
      { key: 'SAFETY_AND_COMPLIANCE', label: 'Safety and compliance', type: 'number' },
    ];
    return {
      columns: [
        { key: 'partnerName', label: 'Partner', type: 'text' as const },
        { key: 'period', label: 'Period', type: 'text' as const },
        ...kpiColumns,
        { key: 'jobsCompleted', label: 'Jobs completed', type: 'number' as const },
        { key: 'jobsOnTime', label: 'Jobs on time', type: 'number' as const },
        { key: 'totalScore', label: 'Total', type: 'number' as const },
        { key: 'category', label: 'Category', type: 'text' as const },
        { key: 'recommendation', label: 'Recommendation', type: 'text' as const },
      ],
      rows: scores.map((score) => {
        const kpis: ReportRow = {};
        for (const column of kpiColumns) {
          const kpi = score.kpis.find((item) => item.code === column.key);
          kpis[column.key] = kpi ? round(kpi.weighted, 1) : null;
        }
        return {
          partnerName: score.partner.businessName,
          period: `${String(score.periodMonth).padStart(2, '0')}/${score.periodYear}`,
          ...kpis,
          jobsCompleted: score.jobsCompleted,
          jobsOnTime: score.jobsOnTime,
          totalScore: round(score.totalScore, 1),
          category: score.category,
          recommendation: score.recommendation,
        };
      }),
    };
  }

  private async invoiceAgeing(filters: ReportFilters) {
    const invoices = await this.prisma.partnerInvoice.findMany({
      where: {
        ...this.company(filters),
        ...(filters.partnerId ? { partnerId: filters.partnerId } : {}),
        status: { notIn: ['DRAFT', 'PAID', 'REJECTED'] },
      },
      orderBy: { invoiceDate: 'asc' },
      include: { partner: { select: { businessName: true } } },
    });
    return {
      columns: [
        { key: 'invoiceNumber', label: 'Invoice', type: 'text' as const },
        { key: 'partnerName', label: 'Partner', type: 'text' as const },
        { key: 'invoiceDate', label: 'Invoice date', type: 'date' as const },
        { key: 'status', label: 'Status', type: 'text' as const },
        { key: 'netAmount', label: 'Net amount', type: 'currency' as const },
        { key: 'ageDays', label: 'Age (days)', type: 'number' as const },
        { key: 'bucket', label: 'Ageing bucket', type: 'text' as const },
        { key: 'holdReason', label: 'Hold reason', type: 'text' as const },
      ],
      rows: invoices.map((invoice) => {
        const days = ageInDays(invoice.invoiceDate);
        return {
          invoiceNumber: invoice.invoiceNumber,
          partnerName: invoice.partner.businessName,
          invoiceDate: invoice.invoiceDate.toISOString(),
          status: invoice.status,
          netAmount: round(invoice.netAmount),
          ageDays: days,
          bucket: bucket(days),
          holdReason: invoice.holdReason ?? null,
        };
      }),
    };
  }

  private async paymentAgeing(filters: ReportFilters) {
    const invoices = await this.prisma.partnerInvoice.findMany({
      where: {
        ...this.company(filters),
        ...(filters.partnerId ? { partnerId: filters.partnerId } : {}),
        status: 'PAID',
        paidAt: { not: null },
        ...(filters.from || filters.to
          ? {
              paidAt: {
                not: null,
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {}),
              },
            }
          : {}),
      },
      orderBy: { paidAt: 'desc' },
      include: { partner: { select: { businessName: true } } },
    });
    return {
      columns: [
        { key: 'invoiceNumber', label: 'Invoice', type: 'text' as const },
        { key: 'partnerName', label: 'Partner', type: 'text' as const },
        { key: 'invoiceDate', label: 'Invoice date', type: 'date' as const },
        { key: 'paidAt', label: 'Paid on', type: 'date' as const },
        { key: 'netAmount', label: 'Net amount', type: 'currency' as const },
        { key: 'daysToPay', label: 'Days to pay', type: 'number' as const },
        { key: 'bucket', label: 'Bucket', type: 'text' as const },
      ],
      rows: invoices.map((invoice) => {
        const days = invoice.paidAt ? ageInDays(invoice.invoiceDate, invoice.paidAt) : 0;
        return {
          invoiceNumber: invoice.invoiceNumber,
          partnerName: invoice.partner.businessName,
          invoiceDate: invoice.invoiceDate.toISOString(),
          paidAt: invoice.paidAt ? invoice.paidAt.toISOString() : null,
          netAmount: round(invoice.netAmount),
          daysToPay: days,
          bucket: bucket(days),
        };
      }),
    };
  }

  private async outsourcingVsInternal(filters: ReportFilters) {
    const jobs = await this.prisma.gridJob.findMany({
      where: { ...this.jobWhere(filters), partnerId: { not: null } },
      select: {
        rate: true,
        quantity: true,
        acceptedQuantity: true,
        componentId: true,
        component: {
          select: { componentCode: true, name: true, standardConversionRate: true },
        },
      },
    });
    const map = new Map<string, { component: string; quantity: number; outsourced: number; internal: number }>();
    for (const job of jobs) {
      const current = map.get(job.componentId) ?? {
        component: `${job.component.componentCode} — ${job.component.name}`,
        quantity: 0,
        outsourced: 0,
        internal: 0,
      };
      const quantity = job.acceptedQuantity > 0 ? job.acceptedQuantity : job.quantity;
      current.quantity += quantity;
      current.outsourced += quantity * job.rate;
      current.internal += quantity * (job.component.standardConversionRate ?? job.rate);
      map.set(job.componentId, current);
    }
    return {
      columns: [
        { key: 'component', label: 'Component', type: 'text' as const },
        { key: 'quantity', label: 'Quantity', type: 'number' as const },
        { key: 'outsourcedCost', label: 'Outsourced cost', type: 'currency' as const },
        { key: 'internalCost', label: 'Internal standard cost', type: 'currency' as const },
        { key: 'saving', label: 'Saving', type: 'currency' as const },
        { key: 'savingPercent', label: 'Saving %', type: 'number' as const },
      ],
      rows: [...map.values()].map((row) => ({
        component: row.component,
        quantity: round(row.quantity),
        outsourcedCost: round(row.outsourced),
        internalCost: round(row.internal),
        saving: round(row.internal - row.outsourced),
        savingPercent: row.internal > 0 ? round(((row.internal - row.outsourced) / row.internal) * 100, 1) : 0,
      })),
    };
  }

  private async logisticsCost(filters: ReportFilters) {
    const shipments = await this.prisma.shipment.findMany({
      where: {
        ...this.company(filters),
        ...(filters.partnerId
          ? { OR: [{ fromPartnerId: filters.partnerId }, { toPartnerId: filters.partnerId }] }
          : {}),
        ...(filters.from || filters.to
          ? {
              plannedPickupAt: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {}),
              },
            }
          : {}),
      },
      orderBy: { plannedPickupAt: 'desc' },
      include: {
        fromPartner: { select: { businessName: true } },
        toPartner: { select: { businessName: true } },
      },
    });
    return {
      columns: [
        { key: 'shipmentNumber', label: 'Shipment', type: 'text' as const },
        { key: 'direction', label: 'Direction', type: 'text' as const },
        { key: 'route', label: 'Route', type: 'text' as const },
        { key: 'status', label: 'Status', type: 'text' as const },
        { key: 'weightKg', label: 'Weight (kg)', type: 'number' as const },
        { key: 'transportCost', label: 'Transport cost', type: 'currency' as const },
        { key: 'costPerKg', label: 'Cost per kg', type: 'currency' as const },
        { key: 'plannedPickupAt', label: 'Planned pickup', type: 'date' as const },
      ],
      rows: shipments.map((shipment) => ({
        shipmentNumber: shipment.shipmentNumber,
        direction: shipment.direction,
        route: `${shipment.fromPartner?.businessName ?? shipment.pickupLocation} → ${
          shipment.toPartner?.businessName ?? shipment.deliveryLocation
        }`,
        status: shipment.status,
        weightKg: round(shipment.weightKg, 3),
        transportCost: round(shipment.transportCost),
        costPerKg: shipment.weightKg > 0 ? round(shipment.transportCost / shipment.weightKg) : 0,
        plannedPickupAt: shipment.plannedPickupAt.toISOString(),
      })),
    };
  }

  private async reworkCost(filters: ReportFilters) {
    const reworks = await this.prisma.reworkOrder.findMany({
      where: {
        ...this.companyVia(filters, 'job'),
        ...(filters.partnerId ? { job: { partnerId: filters.partnerId } } : {}),
        ...(filters.from || filters.to
          ? {
              issuedAt: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {}),
              },
            }
          : {}),
      },
      orderBy: { issuedAt: 'desc' },
      include: {
        job: {
          select: {
            jobNumber: true,
            partner: { select: { businessName: true } },
            component: { select: { componentCode: true } },
          },
        },
        nonConformance: { select: { defectType: true, responsibility: true, materialLoss: true } },
      },
    });
    return {
      columns: [
        { key: 'reworkNumber', label: 'Rework', type: 'text' as const },
        { key: 'jobNumber', label: 'Job', type: 'text' as const },
        { key: 'partnerName', label: 'Partner', type: 'text' as const },
        { key: 'componentCode', label: 'Component', type: 'text' as const },
        { key: 'defectType', label: 'Defect', type: 'text' as const },
        { key: 'responsibility', label: 'Responsibility', type: 'text' as const },
        { key: 'quantity', label: 'Quantity', type: 'number' as const },
        { key: 'estimatedCost', label: 'Rework cost', type: 'currency' as const },
        { key: 'materialLoss', label: 'Material loss', type: 'currency' as const },
        { key: 'chargeToPartner', label: 'Charged to partner', type: 'text' as const },
        { key: 'status', label: 'Status', type: 'text' as const },
      ],
      rows: reworks.map((rework) => ({
        reworkNumber: rework.reworkNumber,
        jobNumber: rework.job.jobNumber,
        partnerName: rework.job.partner?.businessName ?? null,
        componentCode: rework.job.component.componentCode,
        defectType: rework.nonConformance?.defectType ?? null,
        responsibility: rework.nonConformance?.responsibility ?? null,
        quantity: round(rework.quantity),
        estimatedCost: round(rework.estimatedCost),
        materialLoss: round(rework.nonConformance?.materialLoss ?? 0),
        chargeToPartner: rework.chargeToPartner ? 'Yes' : 'No',
        status: rework.status,
      })),
    };
  }

  /**
   * Avoided capex proxy (Section 3): the machine-hours delivered by the partner network
   * represent capacity OSWAR did not have to buy.
   */
  private async avoidedCapex(filters: ReportFilters) {
    const declarations = await this.prisma.capacityDeclaration.groupBy({
      by: ['processId'],
      where: {
        ...this.companyVia(filters, 'partner'),
        ...(filters.partnerId ? { partnerId: filters.partnerId } : {}),
        ...(filters.from || filters.to
          ? {
              periodStart: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {}),
              },
            }
          : {}),
      },
      _sum: { availableHours: true, committedHours: true },
      _count: { _all: true },
    });
    const processes = await this.prisma.process.findMany({
      where: { id: { in: declarations.map((row) => row.processId) } },
      select: { id: true, code: true, name: true, standardRatePerHour: true },
    });
    const byId = new Map(processes.map((process) => [process.id, process]));
    return {
      columns: [
        { key: 'process', label: 'Process', type: 'text' as const },
        { key: 'declarations', label: 'Declarations', type: 'number' as const },
        { key: 'availableHours', label: 'Available hours', type: 'number' as const },
        { key: 'committedHours', label: 'Committed hours', type: 'number' as const },
        { key: 'standardRatePerHour', label: 'Standard rate per hour', type: 'currency' as const },
        { key: 'avoidedCapex', label: 'Avoided capex (hours × rate)', type: 'currency' as const },
      ],
      rows: declarations.map((row) => {
        const process = byId.get(row.processId);
        const rate = process?.standardRatePerHour ?? 0;
        const hours = row._sum.availableHours ?? 0;
        return {
          process: process ? `${process.code} — ${process.name}` : row.processId,
          declarations: row._count._all,
          availableHours: round(hours),
          committedHours: round(row._sum.committedHours ?? 0),
          standardRatePerHour: round(rate),
          avoidedCapex: round(hours * rate),
        };
      }),
    };
  }

  private async capacityAdded(filters: ReportFilters) {
    const machines = await this.prisma.partnerMachine.findMany({
      where: {
        ...this.companyVia(filters, 'partner'),
        ...(filters.partnerId ? { partnerId: filters.partnerId } : {}),
      },
      select: {
        machineType: true,
        make: true,
        model: true,
        capacity: true,
        condition: true,
        ownership: true,
        quantity: true,
        partner: { select: { businessName: true, approvalStatus: true } },
      },
    });
    return {
      columns: [
        { key: 'partnerName', label: 'Partner', type: 'text' as const },
        { key: 'approvalStatus', label: 'Partner status', type: 'text' as const },
        { key: 'machineType', label: 'Machine type', type: 'text' as const },
        { key: 'makeModel', label: 'Make / model', type: 'text' as const },
        { key: 'capacity', label: 'Capacity', type: 'text' as const },
        { key: 'condition', label: 'Condition', type: 'text' as const },
        { key: 'ownership', label: 'Ownership', type: 'text' as const },
        { key: 'quantity', label: 'Machines', type: 'number' as const },
      ],
      rows: machines.map((machine) => ({
        partnerName: machine.partner.businessName,
        approvalStatus: machine.partner.approvalStatus,
        machineType: machine.machineType,
        makeModel: [machine.make, machine.model].filter(Boolean).join(' ') || null,
        capacity: machine.capacity ?? null,
        condition: machine.condition,
        ownership: machine.ownership,
        quantity: machine.quantity,
      })),
    };
  }

  /** Concentration risk (Section 3): share of outsourced value held by each partner. */
  private async partnerConcentration(filters: ReportFilters) {
    const jobs = await this.prisma.gridJob.findMany({
      where: { ...this.jobWhere(filters), partnerId: { not: null } },
      select: {
        partnerId: true,
        quantity: true,
        rate: true,
        componentId: true,
        partner: { select: { businessName: true } },
      },
    });
    const totals = new Map<string, { partnerName: string; value: number; jobs: number; components: Set<string> }>();
    let grandTotal = 0;
    for (const job of jobs) {
      const id = job.partnerId as string;
      const current = totals.get(id) ?? {
        partnerName: job.partner?.businessName ?? id,
        value: 0,
        jobs: 0,
        components: new Set<string>(),
      };
      const value = job.quantity * job.rate;
      current.value += value;
      current.jobs += 1;
      current.components.add(job.componentId);
      grandTotal += value;
      totals.set(id, current);
    }
    return {
      columns: [
        { key: 'partnerName', label: 'Partner', type: 'text' as const },
        { key: 'jobs', label: 'Jobs', type: 'number' as const },
        { key: 'components', label: 'Distinct components', type: 'number' as const },
        { key: 'value', label: 'Outsourced value', type: 'currency' as const },
        { key: 'sharePercent', label: 'Share of value %', type: 'number' as const },
      ],
      rows: [...totals.values()]
        .sort((a, b) => b.value - a.value)
        .map((row) => ({
          partnerName: row.partnerName,
          jobs: row.jobs,
          components: row.components.size,
          value: round(row.value),
          sharePercent: grandTotal > 0 ? round((row.value / grandTotal) * 100, 1) : 0,
        })),
    };
  }

  private async drawingAccessAudit(filters: ReportFilters) {
    const logs = await this.prisma.drawingAccessLog.findMany({
      where: {
        // Access logs reach their company two relations up, through the revision's drawing.
        ...(filters.companyIds
          ? { revision: { drawing: { companyId: { in: filters.companyIds } } } }
          : {}),
        ...(filters.partnerId ? { partnerId: filters.partnerId } : {}),
        ...(filters.from || filters.to
          ? {
              createdAt: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {}),
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
      include: {
        partner: { select: { businessName: true } },
        user: { select: { name: true } },
        revision: {
          select: {
            revisionCode: true,
            drawing: { select: { drawingNumber: true, title: true } },
          },
        },
      },
    });
    return {
      columns: [
        { key: 'createdAt', label: 'Timestamp', type: 'date' as const },
        { key: 'drawing', label: 'Drawing', type: 'text' as const },
        { key: 'revision', label: 'Revision', type: 'text' as const },
        { key: 'event', label: 'Event', type: 'text' as const },
        { key: 'partnerName', label: 'Partner', type: 'text' as const },
        { key: 'userName', label: 'User', type: 'text' as const },
        { key: 'ipAddress', label: 'IP address', type: 'text' as const },
      ],
      rows: logs.map((log) => ({
        createdAt: log.createdAt.toISOString(),
        drawing: `${log.revision.drawing.drawingNumber} — ${log.revision.drawing.title}`,
        revision: log.revision.revisionCode,
        event: log.event,
        partnerName: log.partner?.businessName ?? null,
        userName: log.user?.name ?? null,
        ipAddress: log.ipAddress ?? null,
      })),
    };
  }
}
