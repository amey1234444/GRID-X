import Link from 'next/link';
import type {
  FinanceDashboard,
  JobSummary,
  ManagementDashboard,
  OperationsDashboard,
  QualityDashboard,
} from '@gridx/shared';
import { ArrowRight } from 'lucide-react';

import { CategoryBarChart, DistributionPieChart, TrendAreaChart } from '@/components/app/charts';
import { DataTable, type Column } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
      <div>
        <p className="font-medium">{job.componentName}</p>
        <p className="text-xs text-muted-foreground">{job.componentCode}</p>
      </div>
    ),
  },
  { key: 'partner', header: 'Partner', render: (job) => job.partnerName ?? 'Unallocated' },
  { key: 'quantity', header: 'Qty', align: 'right', render: (job) => formatNumber(job.quantity) },
  { key: 'status', header: 'Status', render: (job) => <StatusBadge status={job.status} /> },
  { key: 'due', header: 'Due', render: (job) => relativeDays(job.dueDate) },
];

function JobPanel({
  title,
  description,
  jobs,
}: {
  title: string;
  description: string;
  jobs: JobSummary[];
}): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/app/production/jobs">
            All jobs <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={jobColumns}
          rows={jobs.slice(0, 6)}
          rowHref={(job) => `/app/production/jobs/${job.id}`}
          empty={{ title: 'Nothing pending here', description: 'This queue is clear.' }}
        />
      </CardContent>
    </Card>
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

  return (
    <>
      <PageHeader
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active partners" value={formatNumber(management.activePartners)} hint="Approved and above" />
        <StatCard label="Jobs in progress" value={formatNumber(management.jobsInProgress)} hint="Across the network" />
        <StatCard
          label="Jobs at risk"
          value={formatNumber(management.jobsAtRisk)}
          tone={management.jobsAtRisk > 0 ? 'warning' : 'default'}
          hint="Overdue or delayed"
        />
        <StatCard label="Outsourced value" value={formatCurrency(management.totalOutsourcedValue)} hint="Open jobs" />
        <StatCard
          label="Quality acceptance"
          value={formatPercent(management.qualityAcceptanceRate)}
          tone="success"
          hint="Accepted vs inspected"
        />
        <StatCard label="On-time delivery" value={formatPercent(management.onTimeDeliveryRate)} hint="Closed jobs" />
        <StatCard
          label="Material with partners"
          value={`${formatNumber(management.materialUnderPartnerCustodyKg)} kg`}
          hint={formatCurrency(management.materialUnderPartnerCustodyValue)}
        />
        <StatCard
          label="Overdue payments"
          value={formatCurrency(management.overduePayments)}
          tone={management.overduePayments > 0 ? 'destructive' : 'default'}
          hint="Beyond agreed terms"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Outsourcing trend</CardTitle>
            <CardDescription>Monthly outsourced value with acceptance and on-time delivery.</CardDescription>
          </CardHeader>
          <CardContent>
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
              <p className="py-16 text-center text-sm text-muted-foreground">
                Trend data appears once jobs have been closed.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Jobs by status</CardTitle>
            <CardDescription>Live distribution of the job pipeline.</CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <DistributionPieChart data={statusData} nameKey="status" valueKey="count" />
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">No jobs yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="operations">
        <TabsList>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="partners">Partners</TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <JobPanel title="Due today" description="Jobs promised for today." jobs={operations.dueToday} />
            <JobPanel title="Delayed" description="Past the promised date." jobs={operations.delayedJobs} />
            <JobPanel
              title="Awaiting inspection"
              description="Partner has offered quantity for inspection."
              jobs={operations.awaitingInspection}
            />
            <JobPanel
              title="Material pending"
              description="Allocated but material not yet issued or acknowledged."
              jobs={operations.materialPending}
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Partner workload</CardTitle>
              <CardDescription>Committed against declared capacity.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
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
                    render: (row) => formatPercent(row.utilisationPercent),
                  },
                ]}
                rows={operations.partnerWorkload}
                empty={{ title: 'No workload declared yet' }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="First articles pending" value={formatNumber(quality.firstArticlesPending)} />
            <StatCard
              label="Rejection rate"
              value={formatPercent(quality.rejectionRate)}
              tone={quality.rejectionRate > 5 ? 'warning' : 'success'}
            />
            <StatCard label="Open corrective actions" value={formatNumber(quality.openCorrectiveActions)} />
            <StatCard label="Inspectors engaged" value={formatNumber(quality.inspectionWorkload.length)} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rework ageing</CardTitle>
                <CardDescription>How long rework has been open.</CardDescription>
              </CardHeader>
              <CardContent>
                {quality.reworkAgeingDays.length > 0 ? (
                  <CategoryBarChart data={quality.reworkAgeingDays} xKey="bucket" valueKey="count" label="Rework orders" />
                ) : (
                  <p className="py-16 text-center text-sm text-muted-foreground">No open rework.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Repeat defects</CardTitle>
                <CardDescription>Defect types recurring across partners.</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'defect', header: 'Defect', render: (row) => humanise(row.defectType) },
                    { key: 'count', header: 'Occurrences', align: 'right', render: (row) => formatNumber(row.count) },
                    { key: 'partners', header: 'Partners', align: 'right', render: (row) => formatNumber(row.partners) },
                  ]}
                  rows={quality.repeatDefects}
                  empty={{ title: 'No repeat defects recorded' }}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="finance" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Invoices pending"
              value={formatNumber(finance.invoicesPending)}
              hint={formatCurrency(finance.invoicesPendingValue)}
            />
            <StatCard label="Accepted value" value={formatCurrency(finance.acceptedValue)} />
            <StatCard label="Payments due" value={formatCurrency(finance.paymentsDue)} />
            <StatCard
              label="Reconciliation pending"
              value={formatNumber(finance.materialReconciliationPending)}
              tone={finance.materialReconciliationPending > 0 ? 'warning' : 'default'}
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Invoice ageing</CardTitle>
                <CardDescription>Value awaiting approval or payment.</CardDescription>
              </CardHeader>
              <CardContent>
                {finance.invoiceAgeing.length > 0 ? (
                  <CategoryBarChart data={finance.invoiceAgeing} xKey="bucket" valueKey="value" label="Value (₹)" />
                ) : (
                  <p className="py-16 text-center text-sm text-muted-foreground">No open invoices.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Partner outstanding</CardTitle>
                <CardDescription>Amounts payable by partner.</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="partners" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top partners</CardTitle>
                <CardDescription>Highest scorecard results this period.</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
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
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Needs attention</CardTitle>
                <CardDescription>Lowest scoring partners.</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
