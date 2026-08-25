import Link from 'next/link';
import type {
  FinanceDashboard,
  JobSummary,
  ManagementDashboard,
  OperationsDashboard,
  QualityDashboard,
} from '@gridx/shared';
import { AlertTriangle, CheckCircle2, Clock, PackageCheck, ShieldCheck, TrendingUp, Wallet } from 'lucide-react';

import { CategoryBarChart, DistributionPieChart, TrendAreaChart } from '@/components/app/charts';
import { InsightBanner, MetricItem, MetricStrip, Panel, PanelEmpty } from '@/components/app/dashboard';
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
  { key: 'partner', header: 'Partner', render: (job) => job.partnerName ?? <span className="text-subtle">Unallocated</span> },
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
      action={jobs.length > 6 ? { label: `All ${jobs.length}`, href: '/app/production/jobs' } : undefined}
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

      {/* 1 — the single thing that decides whether you keep reading. */}
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
                { key: 'openJobs', header: 'Open jobs', align: 'right', render: (row) => formatNumber(row.openJobs) },
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
            <MetricItem label="Inspectors engaged" value={formatNumber(quality.inspectionWorkload.length)} />
          </MetricStrip>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Rework ageing" description="How long rework has been open." icon={AlertTriangle}>
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
                  { key: 'count', header: 'Occurrences', align: 'right', render: (row) => formatNumber(row.count) },
                  { key: 'partners', header: 'Partners', align: 'right', render: (row) => formatNumber(row.partners) },
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
            <Panel title="Invoice ageing" description="Value awaiting approval or payment." icon={Wallet}>
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

            <Panel title="Partner outstanding" description="Amounts payable by partner." bodyClassName="px-0 pb-0">
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
                  { key: 'score', header: 'Score', align: 'right', render: (row) => formatNumber(row.score, 1) },
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
                  { key: 'score', header: 'Score', align: 'right', render: (row) => formatNumber(row.score, 1) },
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
