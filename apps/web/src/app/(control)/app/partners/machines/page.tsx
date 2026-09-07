import { DataTable, type Column } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { PaginationControls } from '@/components/app/pagination-controls';
import { SearchFilters } from '@/components/app/search-filters';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { humanise } from '@/lib/format';
import { readPage, readParam, type SearchParams } from '@/lib/query';
import { partnerOptions } from '@/lib/reference';
import { apiGet } from '@/lib/session';
import { emptyPage, type MachineRow, type Paginated } from '@/lib/types';

export const metadata = { title: 'Machines · GRID-X' };

export default async function MachinesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const page = readPage(searchParams);
  const query = new URLSearchParams({ page: String(page), pageSize: '25' });
  for (const key of ['partnerId', 'search']) {
    const value = readParam(searchParams, key);
    if (value) query.set(key, value);
  }

  const [machines, partners] = await Promise.all([
    apiGet<Paginated<MachineRow>>(`/partners/machines?${query.toString()}`, emptyPage<MachineRow>()),
    partnerOptions(),
  ]);

  const byType = new Set(machines.data.map((row) => row.machineType));
  const rented = machines.data.filter((row) => row.ownership !== 'OWNED');
  const needingAttention = machines.data.filter(
    (row) => row.condition === 'POOR' || row.condition === 'UNDER_REPAIR',
  );

  const columns: Column<MachineRow>[] = [
    {
      key: 'machine',
      header: 'Machine',
      render: (row) => (
        <span className="block">
          <span className="block font-medium">{humanise(row.machineType)}</span>
          <span className="block text-xs text-muted-foreground">
            {[row.make, row.model].filter(Boolean).join(' ') || '—'}
          </span>
        </span>
      ),
    },
    {
      key: 'partner',
      header: 'Partner',
      render: (row) => (
        <a href={`/app/partners/${row.partnerId}`} className="block hover:underline">
          <span className="block">{row.partnerName}</span>
          <span className="block text-xs text-muted-foreground">{row.city}</span>
        </a>
      ),
    },
    { key: 'size', header: 'Size', render: (row) => row.size ?? '—' },
    { key: 'capacity', header: 'Capacity', render: (row) => row.capacity ?? '—' },
    { key: 'accuracy', header: 'Accuracy', render: (row) => row.accuracy ?? '—' },
    {
      key: 'quantity',
      header: 'Qty',
      align: 'right',
      render: (row) => <span className="tabular-nums">{row.quantity}</span>,
    },
    {
      key: 'condition',
      header: 'Condition',
      render: (row) => <StatusBadge status={row.condition} />,
    },
    {
      key: 'ownership',
      header: 'Owned',
      render: (row) => (
        <span className="text-xs text-muted-foreground">{humanise(row.ownership)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon="Factory"
        title="Machines"
        description="Every machine registered across the partner network — what the network can physically make."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Machine types on this page" value={String(byType.size)} />
        <StatCard label="Rented or leased" value={String(rented.length)} hint="Not partner-owned" />
        <StatCard
          label="Poor or under repair"
          value={String(needingAttention.length)}
          hint="Capacity you should not count on"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Machine register</CardTitle>
          <CardDescription>
            Search by type, make or model to find who can take a job that needs a particular
            machine.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchFilters
            searchPlaceholder="Search type, make or model…"
            filters={[{ name: 'partnerId', label: 'Partner', options: partners }]}
          />
          <DataTable
            columns={columns}
            rows={machines.data}
            empty={{
              title: 'No machines registered',
              description: 'Machines added to a partner profile appear here.',
            }}
          />
          <PaginationControls
            page={page}
            totalPages={machines.totalPages}
            total={machines.total}
          />
        </CardContent>
      </Card>
    </div>
  );
}
