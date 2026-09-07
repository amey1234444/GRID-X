import { REWORK_STATUSES } from '@gridx/shared';

import { createReworkAction, updateReworkAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { DataTable, type Column } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { PaginationControls } from '@/components/app/pagination-controls';
import { SearchFilters } from '@/components/app/search-filters';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';
import { optionsFrom } from '@/lib/options';
import { readPage, readParam, type SearchParams } from '@/lib/query';
import { jobOptions } from '@/lib/reference';
import { apiGet } from '@/lib/session';
import { emptyPage, type Paginated, type ReworkRow } from '@/lib/types';

export const metadata = { title: 'Rework · GRID-X' };

export default async function ReworkPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const page = readPage(searchParams);
  const query = new URLSearchParams({ page: String(page), pageSize: '25' });
  for (const key of ['search', 'status']) {
    const value = readParam(searchParams, key);
    if (value) query.set(key, value);
  }

  const [rework, jobs] = await Promise.all([
    apiGet<Paginated<ReworkRow>>(`/quality/rework?${query.toString()}`, emptyPage<ReworkRow>()),
    jobOptions(),
  ]);

  const columns: Column<ReworkRow>[] = [
    {
      key: 'rework',
      header: 'Rework order',
      render: (row) => (
        <span className="block">
          <span className="block font-medium">{row.reworkNumber}</span>
          <span className="block text-xs text-muted-foreground">{formatDate(row.issuedAt)}</span>
        </span>
      ),
    },
    { key: 'job', header: 'Job', render: (row) => row.job?.jobNumber ?? '—' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'qty', header: 'Quantity', align: 'right', render: (row) => formatNumber(row.quantity) },
    { key: 'cost', header: 'Estimated cost', align: 'right', render: (row) => formatCurrency(row.estimatedCost) },
    {
      key: 'charge',
      header: 'Charged to',
      render: (row) => (row.chargeToPartner ? 'Partner' : 'OSWAR'),
    },
    { key: 'due', header: 'Due', render: (row) => formatDate(row.dueDate) },
    {
      key: 'update',
      header: '',
      render: (row) =>
        row.status === 'COMPLETED' || row.status === 'SCRAPPED' ? null : (
          <ActionDialog
            title="Update rework"
            triggerLabel="Update"
            triggerSize="sm"
            triggerVariant="outline"
            action={updateReworkAction}
            hidden={{ reworkId: row.id }}
            fields={[
              { name: 'status', label: 'Status', type: 'select', required: true, options: optionsFrom(REWORK_STATUSES), span: 2 },
              { name: 'completedQuantity', label: 'Completed quantity', type: 'number' },
              { name: 'scrappedQuantity', label: 'Scrapped quantity', type: 'number' },
              { name: 'actualCost', label: 'Actual cost', type: 'number', step: '0.01' },
              { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
            ]}
          />
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon="ShieldCheck"
        title="Rework"
        description="Rework orders raised from rejections, with cost responsibility and completion tracking."
        actions={
          <ActionDialog
            title="Create rework order"
            triggerLabel="New rework order"
            action={createReworkAction}
            fields={[
              { name: 'jobId', label: 'Job', type: 'select', required: true, options: jobs, span: 2 },
              { name: 'quantity', label: 'Quantity', type: 'number', required: true },
              { name: 'estimatedCost', label: 'Estimated cost', type: 'number', step: '0.01' },
              { name: 'dueDate', label: 'Due date', type: 'date' },
              { name: 'chargeToPartner', label: 'Charge to partner', type: 'checkbox', defaultValue: 'on' },
              { name: 'instructions', label: 'Instructions', type: 'textarea', required: true, span: 2 },
            ]}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Rework orders" value={formatNumber(rework.total)} />
        <StatCard
          label="Open"
          value={formatNumber(rework.data.filter((row) => !['COMPLETED', 'SCRAPPED'].includes(row.status)).length)}
          tone="warning"
        />
        <StatCard label="Quantity" value={formatNumber(rework.data.reduce((sum, row) => sum + row.quantity, 0))} />
        <StatCard
          label="Estimated cost"
          value={formatCurrency(rework.data.reduce((sum, row) => sum + row.estimatedCost, 0))}
        />
      </div>

      <SearchFilters
        searchPlaceholder="Search by rework number or job…"
        filters={[{ name: 'status', label: 'Status', options: optionsFrom(REWORK_STATUSES) }]}
      />

      <DataTable
        columns={columns}
        rows={rework.data}
        empty={{ title: 'No rework orders', description: 'Rework is raised when an inspection decision is rework.' }}
      />

      <PaginationControls page={rework.page} totalPages={rework.totalPages} total={rework.total} />
    </div>
  );
}
