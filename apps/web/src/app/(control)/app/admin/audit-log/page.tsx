import { DataTable, type Column } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { PaginationControls } from '@/components/app/pagination-controls';
import { SearchFilters } from '@/components/app/search-filters';
import { StatCard } from '@/components/app/stat-card';
import { formatDateTime, formatNumber, humanise } from '@/lib/format';
import { readPage, readParam, type SearchParams } from '@/lib/query';
import { apiGet } from '@/lib/session';
import { emptyPage, type AuditLogRow, type Paginated } from '@/lib/types';

export const metadata = { title: 'Audit log · GRID-X' };

const ENTITY_TYPES = [
  'GridJob',
  'Partner',
  'DrawingRevision',
  'MaterialIssue',
  'Inspection',
  'PartnerInvoice',
  'User',
  'SystemSetting',
];

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const page = readPage(searchParams);
  const query = new URLSearchParams({ page: String(page), pageSize: '50' });
  for (const key of ['search', 'entityType', 'action']) {
    const value = readParam(searchParams, key);
    if (value) query.set(key, value);
  }

  const logs = await apiGet<Paginated<AuditLogRow>>(
    `/audit-logs?${query.toString()}`,
    emptyPage<AuditLogRow>(),
  );

  const columns: Column<AuditLogRow>[] = [
    { key: 'when', header: 'When', render: (row) => formatDateTime(row.createdAt) },
    { key: 'actor', header: 'Actor', render: (row) => row.actorLabel ?? 'System' },
    { key: 'action', header: 'Action', render: (row) => <span className="font-medium">{humanise(row.action)}</span> },
    {
      key: 'entity',
      header: 'Entity',
      render: (row) => (
        <span className="block">
          <span className="block">{humanise(row.entityType)}</span>
          <span className="block font-mono text-xs text-muted-foreground">{row.entityId}</span>
        </span>
      ),
    },
    { key: 'ip', header: 'IP address', render: (row) => row.ipAddress ?? '—' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Append-only trail of every approval, drawing access, material movement and financial decision."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Entries" value={formatNumber(logs.total)} />
        <StatCard label="On this page" value={formatNumber(logs.data.length)} />
      </div>

      <SearchFilters
        searchPlaceholder="Search by action, entity or actor…"
        filters={[
          {
            name: 'entityType',
            label: 'Entity',
            options: ENTITY_TYPES.map((value) => ({ value, label: humanise(value) })),
          },
        ]}
      />

      <DataTable
        columns={columns}
        rows={logs.data}
        empty={{ title: 'No audit entries', description: 'Activity will appear here as soon as the platform is used.' }}
      />
      <PaginationControls page={logs.page} totalPages={logs.totalPages} total={logs.total} />
    </div>
  );
}
