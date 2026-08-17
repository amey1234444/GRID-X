import { JOB_PRIORITIES, JOB_STATUSES, MATERIAL_RESPONSIBILITIES } from '@gridx/shared';

import { createJobAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { DataTable, type Column } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { PaginationControls } from '@/components/app/pagination-controls';
import { SearchFilters } from '@/components/app/search-filters';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatNumber } from '@/lib/format';
import { optionsFrom } from '@/lib/options';
import { readPage, readParam, type SearchParams } from '@/lib/query';
import { companyOptions, componentOptions, partnerOptions } from '@/lib/reference';
import { apiGet } from '@/lib/session';
import { emptyPage, type JobRow, type Paginated } from '@/lib/types';

export const metadata = { title: 'Jobs · GRID-X' };

export default async function JobsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const page = readPage(searchParams);
  const query = new URLSearchParams({ page: String(page), pageSize: '25' });
  for (const key of ['search', 'status', 'partnerId', 'priority', 'overdue']) {
    const value = readParam(searchParams, key);
    if (value) query.set(key, value);
  }

  const [jobs, partners, components, companies] = await Promise.all([
    apiGet<Paginated<JobRow>>(`/jobs?${query.toString()}`, emptyPage<JobRow>()),
    partnerOptions(),
    componentOptions(),
    companyOptions(),
  ]);

  const overdue = jobs.data.filter((job) => job.isOverdue).length;
  const unallocated = jobs.data.filter((job) => job.partnerId === null).length;

  const columns: Column<JobRow>[] = [
    {
      key: 'job',
      header: 'Job',
      render: (row) => (
        <span className="block">
          <span className="block font-medium">{row.jobNumber}</span>
          <span className="block text-xs text-muted-foreground">
            {row.componentCode} · {row.componentName}
          </span>
        </span>
      ),
    },
    {
      key: 'partner',
      header: 'Partner',
      render: (row) => row.partnerName ?? <span className="text-muted-foreground">Unallocated</span>,
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'priority',
      header: 'Priority',
      render: (row) => (
        <Badge variant={row.priority === 'URGENT' || row.priority === 'CRITICAL' ? 'destructive' : 'outline'}>
          {row.priority}
        </Badge>
      ),
    },
    { key: 'quantity', header: 'Qty', align: 'right', render: (row) => formatNumber(row.quantity) },
    {
      key: 'accepted',
      header: 'Accepted / rejected',
      align: 'right',
      render: (row) => `${formatNumber(row.acceptedQuantity)} / ${formatNumber(row.rejectedQuantity)}`,
    },
    {
      key: 'due',
      header: 'Due',
      render: (row) => (
        <span className={row.isOverdue ? 'font-medium text-destructive' : undefined}>{formatDate(row.dueDate)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jobs"
        description="Every outsourced job from creation through allocation, production, inspection and closure."
        actions={
          <ActionDialog
            title="Create job"
            description="Jobs start in draft. Allocation checks partner approval, capability, capacity and Class A authorisation."
            triggerLabel="New job"
            action={createJobAction}
            hidden={{ companyId: companies[0]?.value }}
            fields={[
              { name: 'componentId', label: 'Component', type: 'select', required: true, options: components, span: 2 },
              { name: 'quantity', label: 'Quantity', type: 'number', required: true },
              { name: 'rate', label: 'Conversion rate', type: 'number', step: '0.01', required: true },
              { name: 'dueDate', label: 'Due date', type: 'date', required: true },
              { name: 'plannedStartDate', label: 'Planned start', type: 'date' },
              { name: 'priority', label: 'Priority', type: 'select', options: optionsFrom(JOB_PRIORITIES), defaultValue: 'NORMAL' },
              {
                name: 'materialResponsibility',
                label: 'Material responsibility',
                type: 'select',
                options: optionsFrom(MATERIAL_RESPONSIBILITIES),
                defaultValue: 'OSWAR_SUPPLIED',
              },
              { name: 'partnerId', label: 'Partner (optional)', type: 'select', options: partners },
              { name: 'customerProject', label: 'Customer / project' },
              { name: 'deliveryLocation', label: 'Delivery location' },
              { name: 'sourceRef', label: 'Source reference', help: 'IMS work order or sales order number' },
              { name: 'notes', label: 'Notes', type: 'textarea', span: 2 },
            ]}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Jobs" value={formatNumber(jobs.total)} />
        <StatCard label="Overdue on this page" value={formatNumber(overdue)} tone="destructive" />
        <StatCard label="Unallocated" value={formatNumber(unallocated)} tone="warning" />
        <StatCard
          label="Quantity in flight"
          value={formatNumber(jobs.data.reduce((sum, job) => sum + job.quantity, 0))}
        />
      </div>

      <SearchFilters
        searchPlaceholder="Search by job number, component or partner…"
        filters={[
          { name: 'status', label: 'Status', options: optionsFrom(JOB_STATUSES) },
          { name: 'priority', label: 'Priority', options: optionsFrom(JOB_PRIORITIES) },
          { name: 'partnerId', label: 'Partner', options: partners },
        ]}
      />

      <DataTable
        columns={columns}
        rows={jobs.data}
        rowHref={(row) => `/app/production/jobs/${row.id}`}
        empty={{ title: 'No jobs match these filters', description: 'Create a job to start the outsourcing workflow.' }}
      />

      <PaginationControls page={jobs.page} totalPages={jobs.totalPages} total={jobs.total} />
    </div>
  );
}
