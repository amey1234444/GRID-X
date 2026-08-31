import Link from 'next/link';
import type {
  FinanceDashboard,
  JobSummary,
  ManagementDashboard,
  OperationsDashboard,
  QualityDashboard,
} from '@gridx/shared';
import {
  Activity,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Clock,
  Factory,
  Gauge,
  PackageCheck,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';

import { CategoryBarChart, DistributionPieChart, TrendAreaChart } from '@/components/app/charts';
import {
  InsightBanner,
  MetricItem,
  MetricStrip,
  Panel,
  PanelEmpty,
} from '@/components/app/dashboard';
import { DataTable, type Column } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { StatusBadge } from '@/components/app/status-badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, formatNumber, formatPercent, humanise, relativeDays } from '@/lib/format';
import { apiGet, currentUser } from '@/lib/session';

const emptyManagement: ManagementDashboard = {
  activePartners: 0,
  jobsInProgress: 0,
  jobsAtRisk: 0,
  totalOutsourcedValue: 0,
  costSavings: 0,
  avoidedCapex: 0,
  qualityAcceptanceRate: 0,
  onTimeDeliveryRate: 0,
  totalNetworkCapacityHours: 0,
  capacityUtilisationPercent: 0,
  topPartners: [],
  bottomPartners: [],
  materialUnderPartnerCustodyKg: 0,
  materialUnderPartnerCustodyValue: 0,
  overduePayments: 0,
  estimatedAdditionalCapacityHours: 0,
  jobsByStatus: [],
  monthlyTrend: [],
};

const emptyOperations: OperationsDashboard = {
  dueToday: [],
  delayedJobs: [],
  awaitingInspection: [],
  materialPending: [],
  partnerWorkload: [],
  capacityBottlenecks: [],
  escalations: [],
};

const emptyQuality: QualityDashboard = {
  firstArticlesPending: 0,
  rejectionRate: 0,
  reworkAgeingDays: [],
  repeatDefects: [],
  partnerQualityTrends: [],
  openCorrectiveActions: 0,
  inspectionWorkload: [],
};

const emptyFinance: FinanceDashboard = {
  invoicesPending: 0,
  invoicesPendingValue: 0,
  acceptedValue: 0,
  paymentsDue: 0,
  deductions: 0,
  materialReconciliationPending: 0,
  partnerOutstanding: [],
  costSavingsByCategory: [],
  invoiceAgeing: [],
};

const jobColumns: Column<JobSummary>[] = [
  { key: 'jobNumber', header: 'Job', render: (job) => job.jobNumber },
  {
    key: 'component',
    header: 'Component',
    render: (job) => (
      <span className="block min-w-0">
        <span className="block truncate font-medium">{job.componentName}</span>
        <span className="block truncate text-[0.75rem] text-subtle">{job.componentCode}</span>
      </span>
    ),
  },
  {
    key: 'partner',
    header: 'Partner',
    render: (job) => job.partnerName ?? <span className="text-subtle">Unallocated</span>,
  },
  { key: 'quantity', header: 'Qty', align: 'right', render: (job) => formatNumber(job.quantity) },
  { key: 'status', header: 'Status', render: (job) => <StatusBadge status={job.status} /> },
  { key: 'due', header: 'Due', render: (job) => relativeDays(job.dueDate) },
];

/** A queue panel: the six most urgent rows, with a link to the full list. */
function JobQueue({
  title,
  description,
  jobs,
  emptyText,
}: {
  title: string;
  description: string;
  jobs: JobSummary[];
  emptyText: string;
}): React.JSX.Element {
  return (
    <Panel
      title={title}
      description={description}
      action={
        jobs.length > 6 ? { label: `All ${jobs.length}`, href: '/app/production/jobs' } : undefined
      }
      bodyClassName="px-0 pb-0"
    >
      <DataTable
        columns={jobColumns}
        rows={jobs.slice(0, 6)}
        rowHref={(job) => `/app/production/jobs/${job.id}`}
        density="compact"
        aggregates={false}
        empty={{ title: emptyText, description: 'This queue is clear.' }}
      />
    </Panel>
  );
}

export default async function ControlDashboardPage(): Promise<React.JSX.Element> {
  const user = await currentUser();
  const [management, operations, quality, finance] = await Promise.all([
    apiGet<ManagementDashboard>('/dashboards/management', emptyManagement),
    apiGet<OperationsDashboard>('/dashboards/operations', emptyOperations),
    apiGet<QualityDashboard>('/dashboards/quality', emptyQuality),
    apiGet<FinanceDashboard>('/dashboards/finance', emptyFinance),
  ]);

  const statusData = management.jobsByStatus.map((entry) => ({
    status: humanise(entry.status),
    count: entry.count,
  }));

  const trendData = management.monthlyTrend.map((entry) => ({
    month: entry.month,
    'Outsourced value': entry.outsourcedValue,
    Acceptance: entry.acceptanceRate,
    OTD: entry.otd,
  }));

  // The lead statement escalates: money overdue outranks late jobs, which
  // outrank "everything is fine".
  const atRisk = management.jobsAtRisk;
  const overduePayments = management.overduePayments;

  const insight =
    atRisk > 0
      ? {
          eyebrow: 'Needs attention',
          headline: `${formatNumber(atRisk)} ${atRisk === 1 ? 'job is' : 'jobs are'} at risk`,
          detail:
            'Overdue or flagged as delayed by the partner. Clear these before they cascade into the delivery schedule.',
          tone: 'warning' as const,
          icon: 'Cog',
          action: { label: 'Review delayed jobs', href: '/app/production/delays' },
        }
      : overduePayments > 0
        ? {
            eyebrow: 'Needs attention',
            headline: `${formatCurrency(overduePayments)} overdue to partners`,
            detail: 'Payments beyond agreed terms erode partner capacity commitments.',
            tone: 'destructive' as const,
            icon: 'Wallet',
            action: { label: 'Open payments', href: '/app/commercial/payments' },
          }
        : {
            eyebrow: 'Network status',
            headline: 'The network is running clean',
            detail: `${formatNumber(management.jobsInProgress)} jobs in progress across ${formatNumber(management.activePartners)} active partners, none flagged at risk.`,
            tone: 'success' as const,
            icon: 'ShieldCheck',
            action: { label: 'Open planning board', href: '/app/production/planning-board' },
          };

  return (
    <>
      <PageHeader
        icon="LayoutDashboard"
        title={`Good to see you, ${user?.name.split(' ')[0] ?? 'there'}`}
        description="Network-wide view of the outsourced manufacturing pipeline, quality and money."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/app/reports">Reports</Link>
            </Button>
            <Button asChild>
              <Link href="/app/production/jobs/new">Create job</Link>
            </Button>
          </>
        }
      />

      {/* 1 — command view: the exception, network pulse and immediate actions. */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(310px,0.65fr)]">
        <InsightBanner
          {...insight}
          aside={
            <div className="flex items-center gap-6 sm:gap-8">
              <div>
                <p className="type-label">Acceptance</p>
                <p className="type-metric mt-1.5 text-success" data-numeric>
                  {formatPercent(management.qualityAcceptanceRate)}
                </p>
              </div>
              <div className="h-10 w-px bg-border-subtle" aria-hidden />
              <div>
                <p className="type-label">On-time</p>
                <p className="type-metric mt-1.5" data-numeric>
                  {formatPercent(management.onTimeDeliveryRate)}
                </p>
              </div>
            </div>
          }
        />

        <section className="relative overflow-hidden rounded-card border-t border-border-strong bg-card p-5 shadow-hairline surface-sheen">
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-brand/[0.065] blur-3xl"
            aria-hidden
          />
          <header className="relative flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-brand" />
                <h2 className="font-display text-sm font-medium tracking-[-0.02em]">
                  Network pulse
                </h2>
              </div>
              <p className="mt-1 text-[0.75rem] text-subtle">Current execution readiness</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-control bg-success/10 px-2 py-1 text-[0.6875rem] font-medium text-success">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-success" /> Live
            </span>
          </header>

          <div className="relative mt-4 flex items-center gap-4">
            <div
              className="relative grid h-[82px] w-[82px] shrink-0 place-items-center rounded-full"
              style={{
                background: `conic-gradient(hsl(var(--brand)) ${Math.max(0, Math.min(100, management.capacityUtilisationPercent))}%, hsl(var(--surface-active)) 0)`,
              }}
            >
              <div className="grid h-[68px] w-[68px] place-items-center rounded-full bg-card text-center">
                <div>
                  <p
                    className="font-display text-lg font-medium leading-none tracking-[-0.04em]"
                    data-numeric
                  >
                    {formatPercent(management.capacityUtilisationPercent)}
                  </p>
                  <p className="mt-1 text-[0.5625rem] uppercase tracking-[0.08em] text-subtle">
                    Capacity
                  </p>
                </div>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-2.5">
              {[
                {
                  label: 'Partner coverage',
                  value: `${formatNumber(management.activePartners)} active`,
                  tone: 'bg-success',
                },
                {
                  label: 'Jobs at risk',
                  value: formatNumber(management.jobsAtRisk),
                  tone: management.jobsAtRisk > 0 ? 'bg-warning' : 'bg-success',
                },
                {
                  label: 'Inspection queue',
                  value: formatNumber(operations.awaitingInspection.length),
                  tone: 'bg-brand',
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-[0.75rem]">
                  <span className={`h-1.5 w-1.5 rounded-full ${item.tone}`} />
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    {item.label}
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mt-4 grid grid-cols-2 gap-1.5 border-t border-border-subtle pt-3">
            {[
              { label: 'Production', href: '/app/production/jobs', icon: Factory },
              { label: 'Partners', href: '/app/partners', icon: Users },
              { label: 'Material', href: '/app/materials/issues', icon: Boxes },
              { label: 'Capacity', href: '/app/production/capacity', icon: Gauge },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="group flex items-center gap-2 rounded-control border border-border-subtle bg-surface-elevated px-2.5 py-2 text-[0.75rem] text-muted-foreground transition-colors hover:border-border-strong hover:bg-surface-hover hover:text-foreground"
              >
                <action.icon className="h-3.5 w-3.5 text-subtle transition-colors group-hover:text-brand" />
                {action.label}
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* 2 — supporting figures, dense and unboxed. */}
      <MetricStrip>
        <MetricItem
          label="Jobs in progress"
          value={formatNumber(management.jobsInProgress)}
          hint="Across the network"
          href="/app/production/jobs"
        />
        <MetricItem
          label="Active partners"
          value={formatNumber(management.activePartners)}
          hint="Approved and above"
          href="/app/partners"
        />
        <MetricItem
          label="Outsourced value"
          value={formatCurrency(management.totalOutsourcedValue)}
          hint="Open jobs"
        />
        <MetricItem
          label="Material with partners"
          value={`${formatNumber(management.materialUnderPartnerCustodyKg)} kg`}
          hint={formatCurrency(management.materialUnderPartnerCustodyValue)}
          href="/app/materials/partner-stock"
        />
      </MetricStrip>

      {/* 3 — trend, weighted asymmetrically against the distribution. */}
      <div className="grid gap-4 lg:grid-cols-[1.75fr_1fr]">
        <Panel
          title="Outsourcing trend"
          description="Monthly outsourced value against acceptance and on-time delivery."
          icon={TrendingUp}
        >
          {trendData.length > 0 ? (
            <TrendAreaChart
              data={trendData}
              xKey="month"
              series={[
                { key: 'Outsourced value', label: 'Outsourced value (₹)' },
                { key: 'Acceptance', label: 'Acceptance %' },
                { key: 'OTD', label: 'On-time %' },
              ]}
            />
          ) : (
            <PanelEmpty>Trend data appears once jobs have been closed.</PanelEmpty>
          )}
        </Panel>

        <Panel title="Jobs by status" description="Live pipeline distribution." icon={PackageCheck}>
          {statusData.length > 0 ? (
            <DistributionPieChart data={statusData} nameKey="status" valueKey="count" />
          ) : (
            <PanelEmpty>No jobs yet.</PanelEmpty>
          )}
        </Panel>
      </div>

      {/* 4 — detailed operational data, by discipline. */}
      <Tabs defaultValue="operations">
        <TabsList>
          <TabsTrigger value="operations">
            <Clock /> Operations
          </TabsTrigger>
          <TabsTrigger value="quality">
            <ShieldCheck /> Quality
          </TabsTrigger>
          <TabsTrigger value="finance">
            <Wallet /> Finance
          </TabsTrigger>
          <TabsTrigger value="partners">Partners</TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <JobQueue
              title="Due today"
              description="Promised for today."
              jobs={operations.dueToday}
              emptyText="Nothing due today"
            />
            <JobQueue
              title="Delayed"
              description="Past the promised date."
              jobs={operations.delayedJobs}
              emptyText="No delayed jobs"
            />
            <JobQueue
              title="Awaiting inspection"
              description="Partner has offered quantity."
              jobs={operations.awaitingInspection}
              emptyText="Inspection queue is clear"
            />
            <JobQueue
              title="Material pending"
              description="Allocated but material not issued or acknowledged."
              jobs={operations.materialPending}
              emptyText="No material pending"
            />
          </div>

          <Panel
            title="Partner workload"
            description="Committed against declared capacity."
            action={{ label: 'Capacity', href: '/app/production/capacity' }}
            bodyClassName="px-0 pb-0"
          >
            <DataTable
              density="compact"
              columns={[
                { key: 'partner', header: 'Partner', render: (row) => row.businessName },
                {
                  key: 'openJobs',
                  header: 'Open jobs',
                  align: 'right',
                  render: (row) => formatNumber(row.openJobs),
                },
                {
                  key: 'committed',
                  header: 'Committed hrs',
                  align: 'right',
                  render: (row) => formatNumber(row.committedHours),
                },
                {
                  key: 'available',
                  header: 'Available hrs',
                  align: 'right',
                  render: (row) => formatNumber(row.availableHours),
                },
                {
                  key: 'utilisation',
                  header: 'Utilisation',
                  align: 'right',
                  // A sum of percentages is meaningless — suppress the aggregate.
                  footer: () => null,
                  render: (row) => formatPercent(row.utilisationPercent),
                },
              ]}
              rows={operations.partnerWorkload}
              empty={{ title: 'No workload declared yet' }}
            />
          </Panel>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <MetricStrip>
            <MetricItem
              label="First articles pending"
              value={formatNumber(quality.firstArticlesPending)}
              href="/app/quality/inspections"
            />
            <MetricItem
              label="Rejection rate"
              value={formatPercent(quality.rejectionRate)}
              tone={quality.rejectionRate > 5 ? 'warning' : 'success'}
              hint={quality.rejectionRate > 5 ? 'Above the 5% threshold' : 'Within threshold'}
            />
            <MetricItem
              label="Open corrective actions"
              value={formatNumber(quality.openCorrectiveActions)}
              href="/app/quality/corrective-actions"
            />
            <MetricItem
              label="Inspectors engaged"
              value={formatNumber(quality.inspectionWorkload.length)}
            />
          </MetricStrip>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel
              title="Rework ageing"
              description="How long rework has been open."
              icon={AlertTriangle}
            >
              {quality.reworkAgeingDays.length > 0 ? (
                <CategoryBarChart
                  data={quality.reworkAgeingDays}
                  xKey="bucket"
                  valueKey="count"
                  label="Rework orders"
                  monochrome
                />
              ) : (
                <PanelEmpty>No open rework.</PanelEmpty>
              )}
            </Panel>

            <Panel
              title="Repeat defects"
              description="Defect types recurring across partners."
              bodyClassName="px-0 pb-0"
            >
              <DataTable
                density="compact"
                columns={[
                  { key: 'defect', header: 'Defect', render: (row) => humanise(row.defectType) },
                  {
                    key: 'count',
                    header: 'Occurrences',
                    align: 'right',
                    render: (row) => formatNumber(row.count),
                  },
                  {
                    key: 'partners',
                    header: 'Partners',
                    align: 'right',
                    render: (row) => formatNumber(row.partners),
                  },
                ]}
                rows={quality.repeatDefects}
                empty={{ title: 'No repeat defects recorded' }}
              />
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="finance" className="space-y-4">
          <MetricStrip>
            <MetricItem
              label="Invoices pending"
              value={formatNumber(finance.invoicesPending)}
              hint={formatCurrency(finance.invoicesPendingValue)}
              href="/app/commercial/invoices"
            />
            <MetricItem label="Accepted value" value={formatCurrency(finance.acceptedValue)} />
            <MetricItem
              label="Payments due"
              value={formatCurrency(finance.paymentsDue)}
              href="/app/commercial/payments"
            />
            <MetricItem
              label="Reconciliation pending"
              value={formatNumber(finance.materialReconciliationPending)}
              tone={finance.materialReconciliationPending > 0 ? 'warning' : 'default'}
              href="/app/materials/reconciliation"
            />
          </MetricStrip>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel
              title="Invoice ageing"
              description="Value awaiting approval or payment."
              icon={Wallet}
            >
              {finance.invoiceAgeing.length > 0 ? (
                <CategoryBarChart
                  data={finance.invoiceAgeing}
                  xKey="bucket"
                  valueKey="value"
                  label="Value (₹)"
                  monochrome
                />
              ) : (
                <PanelEmpty>No open invoices.</PanelEmpty>
              )}
            </Panel>

            <Panel
              title="Partner outstanding"
              description="Amounts payable by partner."
              bodyClassName="px-0 pb-0"
            >
              <DataTable
                density="compact"
                columns={[
                  { key: 'partner', header: 'Partner', render: (row) => row.businessName },
                  {
                    key: 'outstanding',
                    header: 'Outstanding',
                    align: 'right',
                    render: (row) => formatCurrency(row.outstanding),
                  },
                ]}
                rows={finance.partnerOutstanding}
                empty={{ title: 'Nothing outstanding' }}
              />
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="partners" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel
              title="Top partners"
              description="Highest scorecard results this period."
              icon={CheckCircle2}
              action={{ label: 'Scorecards', href: '/app/partners/scorecards' }}
              bodyClassName="px-0 pb-0"
            >
              <DataTable
                density="compact"
                aggregates={false}
                columns={[
                  { key: 'partner', header: 'Partner', render: (row) => row.businessName },
                  { key: 'city', header: 'City', render: (row) => row.city },
                  { key: 'category', header: 'Category', render: (row) => row.category },
                  {
                    key: 'score',
                    header: 'Score',
                    align: 'right',
                    render: (row) => formatNumber(row.score, 1),
                  },
                ]}
                rows={management.topPartners}
                rowHref={(row) => `/app/partners/${row.partnerId}`}
                empty={{ title: 'No scorecards computed yet' }}
              />
            </Panel>

            <Panel
              title="Needs attention"
              description="Lowest scoring partners."
              icon={AlertTriangle}
              action={{ label: 'Audits', href: '/app/partners/audits' }}
              bodyClassName="px-0 pb-0"
            >
              <DataTable
                density="compact"
                aggregates={false}
                columns={[
                  { key: 'partner', header: 'Partner', render: (row) => row.businessName },
                  { key: 'city', header: 'City', render: (row) => row.city },
                  { key: 'category', header: 'Category', render: (row) => row.category },
                  {
                    key: 'score',
                    header: 'Score',
                    align: 'right',
                    render: (row) => formatNumber(row.score, 1),
                  },
                ]}
                rows={management.bottomPartners}
                rowHref={(row) => `/app/partners/${row.partnerId}`}
                empty={{ title: 'No scorecards computed yet' }}
              />
            </Panel>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
