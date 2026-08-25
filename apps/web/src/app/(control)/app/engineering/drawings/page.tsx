import { DRAWING_STATUSES } from '@gridx/shared';

import { createDrawingAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { DataTable, type Column } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { PaginationControls } from '@/components/app/pagination-controls';
import { SearchFilters } from '@/components/app/search-filters';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { formatDate, formatNumber } from '@/lib/format';
import { optionsFrom } from '@/lib/options';
import { readPage, readParam, type SearchParams } from '@/lib/query';
import { companyOptions, componentOptions } from '@/lib/reference';
import { apiGet } from '@/lib/session';
import { emptyPage, type DrawingRow, type Paginated } from '@/lib/types';

export const metadata = { title: 'Drawings · GRID-X' };

export default async function DrawingsPage({
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

  const [drawings, companies, components] = await Promise.all([
    apiGet<Paginated<DrawingRow>>(`/drawings?${query.toString()}`, emptyPage<DrawingRow>()),
    companyOptions(),
    componentOptions(),
  ]);

  const pendingAcks = drawings.data.reduce((sum, row) => sum + row.pendingAcknowledgements, 0);

  const columns: Column<DrawingRow>[] = [
    {
      key: 'drawing',
      header: 'Drawing',
      render: (row) => (
        <span className="block">
          <span className="block font-medium">{row.drawingNumber}</span>
          <span className="block text-xs text-muted-foreground">{row.title}</span>
        </span>
      ),
    },
    { key: 'component', header: 'Component', render: (row) => row.componentCode ?? '—' },
    { key: 'revision', header: 'Current revision', render: (row) => row.currentRevisionCode ?? '—' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'released', header: 'Released', render: (row) => formatDate(row.releasedAt) },
    { key: 'revisions', header: 'Revisions', align: 'right', render: (row) => formatNumber(row.revisionCount) },
    {
      key: 'acks',
      header: 'Pending acks',
      align: 'right',
      render: (row) =>
        row.pendingAcknowledgements > 0 ? (
          <span className="font-medium text-warning">{formatNumber(row.pendingAcknowledgements)}</span>
        ) : (
          '0'
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon="Ruler"
        title="Drawings &amp; revision control"
        description="Controlled drawings: only released revisions reach partners, every view is logged and acknowledgements are tracked."
        actions={
          <ActionDialog
            title="Create drawing"
            triggerLabel="New drawing"
            action={createDrawingAction}
            hidden={{ companyId: companies[0]?.value }}
            fields={[
              { name: 'drawingNumber', label: 'Drawing number', required: true },
              { name: 'title', label: 'Title', required: true },
              { name: 'componentId', label: 'Component', type: 'select', options: components, span: 2 },
              { name: 'description', label: 'Description', type: 'textarea', span: 2 },
            ]}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Drawings" value={formatNumber(drawings.total)} />
        <StatCard
          label="Released"
          value={formatNumber(drawings.data.filter((row) => row.status === 'RELEASED').length)}
          tone="success"
        />
        <StatCard label="Pending acknowledgements" value={formatNumber(pendingAcks)} tone="warning" />
        <StatCard
          label="Revisions"
          value={formatNumber(drawings.data.reduce((sum, row) => sum + row.revisionCount, 0))}
        />
      </div>

      <SearchFilters
        searchPlaceholder="Search by drawing number or title…"
        filters={[{ name: 'status', label: 'Status', options: optionsFrom(DRAWING_STATUSES) }]}
      />

      <DataTable
        columns={columns}
        rows={drawings.data}
        rowHref={(row) => `/app/engineering/drawings/${row.id}`}
        empty={{ title: 'No drawings yet', description: 'Create a drawing and upload its first revision.' }}
      />

      <PaginationControls page={drawings.page} totalPages={drawings.totalPages} total={drawings.total} />
    </div>
  );
}
