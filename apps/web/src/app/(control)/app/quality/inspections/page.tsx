import { INSPECTION_TYPES } from '@gridx/shared';

import { requestInspectionAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { DataTable, type Column } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { PaginationControls } from '@/components/app/pagination-controls';
import { SearchFilters } from '@/components/app/search-filters';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { formatDateTime, formatNumber, humanise } from '@/lib/format';
import { optionsFrom } from '@/lib/options';
import { readPage, readParam, type SearchParams } from '@/lib/query';
import { inspectorOptions, jobOptions, partnerOptions } from '@/lib/reference';
import { apiGet } from '@/lib/session';
import { emptyPage, type InspectionRow, type Paginated } from '@/lib/types';

export const metadata = { title: 'Inspections · GRID-X' };

export default async function InspectionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const page = readPage(searchParams);
  const query = new URLSearchParams({ page: String(page), pageSize: '25' });
  for (const key of ['search', 'status', 'type', 'partnerId', 'inspectorId']) {
    const value = readParam(searchParams, key);
    if (value) query.set(key, value);
  }

  const [inspections, jobs, inspectors, partners] = await Promise.all([
    apiGet<Paginated<InspectionRow>>(`/quality/inspections?${query.toString()}`, emptyPage<InspectionRow>()),
    jobOptions(),
    inspectorOptions(),
    partnerOptions(),
  ]);

  const offered = inspections.data.reduce((sum, row) => sum + row.offeredQuantity, 0);
  const rejected = inspections.data.reduce((sum, row) => sum + row.rejectedQuantity, 0);

  const columns: Column<InspectionRow>[] = [
    {
      key: 'inspection',
      header: 'Inspection',
      render: (row) => (
        <span className="block">
          <span className="block font-medium">{row.inspectionNumber}</span>
          <span className="block text-xs text-muted-foreground">{humanise(row.type)}</span>
        </span>
      ),
    },
    { key: 'job', header: 'Job', render: (row) => row.job?.jobNumber ?? '—' },
    { key: 'partner', header: 'Partner', render: (row) => row.partner?.businessName ?? '—' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'decision',
      header: 'Decision',
      render: (row) => (row.decision ? <StatusBadge status={row.decision} /> : '—'),
    },
    {
      key: 'quantities',
      header: 'Offered / accepted / rejected',
      align: 'right',
      render: (row) =>
        `${formatNumber(row.offeredQuantity)} / ${formatNumber(row.acceptedQuantity)} / ${formatNumber(row.rejectedQuantity)}`,
    },
    { key: 'inspector', header: 'Inspector', render: (row) => row.inspector?.name ?? 'Unassigned' },
    { key: 'requested', header: 'Requested', render: (row) => formatDateTime(row.requestedAt) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon="ShieldCheck"
        title="Inspections"
        description="First article, in-process, final and pre-dispatch inspections with accept, reject and rework decisions."
        actions={
          <ActionDialog
            title="Request inspection"
            triggerLabel="Request inspection"
            action={requestInspectionAction}
            fields={[
              { name: 'jobId', label: 'Job', type: 'select', required: true, options: jobs, span: 2 },
              { name: 'type', label: 'Type', type: 'select', options: optionsFrom(INSPECTION_TYPES), defaultValue: 'FINAL' },
              { name: 'offeredQuantity', label: 'Offered quantity', type: 'number', required: true },
              { name: 'inspectorId', label: 'Inspector', type: 'select', options: inspectors },
              { name: 'dueAt', label: 'Due at', type: 'date' },
              {
                name: 'photographFileIds',
                label: 'Photographs',
                type: 'files',
                category: 'PHOTOGRAPH',
                accept: 'image/*',
                span: 2,
              },
              { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
            ]}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Inspections" value={formatNumber(inspections.total)} />
        <StatCard
          label="Open"
          value={formatNumber(
            inspections.data.filter((row) => ['REQUESTED', 'ASSIGNED', 'IN_PROGRESS'].includes(row.status)).length,
          )}
          tone="warning"
        />
        <StatCard label="Quantity offered" value={formatNumber(offered)} />
        <StatCard
          label="Rejection rate"
          value={offered === 0 ? '—' : `${formatNumber((rejected / offered) * 100, 1)}%`}
          tone={offered > 0 && rejected / offered > 0.03 ? 'destructive' : 'success'}
        />
      </div>

      <SearchFilters
        searchPlaceholder="Search by inspection number or job…"
        filters={[
          {
            name: 'status',
            label: 'Status',
            options: optionsFrom(['REQUESTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
          },
          { name: 'type', label: 'Type', options: optionsFrom(INSPECTION_TYPES) },
          { name: 'partnerId', label: 'Partner', options: partners },
        ]}
      />

      <DataTable
        columns={columns}
        rows={inspections.data}
        rowHref={(row) => `/app/quality/inspections/${row.id}`}
        empty={{ title: 'No inspections', description: 'Inspections are requested when a batch is ready.' }}
      />

      <PaginationControls page={inspections.page} totalPages={inspections.totalPages} total={inspections.total} />
    </div>
  );
}
