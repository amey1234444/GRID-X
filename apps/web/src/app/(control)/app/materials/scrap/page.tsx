import { DataTable, type Column } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { PaginationControls } from '@/components/app/pagination-controls';
import { SearchFilters } from '@/components/app/search-filters';
import { StatCard } from '@/components/app/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, formatNumber } from '@/lib/format';
import { readPage, readParam, type SearchParams } from '@/lib/query';
import { partnerOptions } from '@/lib/reference';
import { apiGet } from '@/lib/session';
import { emptyPage, type Paginated, type ScrapRow } from '@/lib/types';

export const metadata = { title: 'Scrap · GRID-X' };

/** Module 6 treats scrap above this as worth a look rather than normal process loss. */
const HIGH_SCRAP_PERCENT = 8;

export default async function ScrapPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const page = readPage(searchParams);
  const query = new URLSearchParams({ page: String(page), pageSize: '25' });
  const partnerId = readParam(searchParams, 'partnerId');
  if (partnerId) query.set('partnerId', partnerId);

  const [scrap, partners] = await Promise.all([
    apiGet<Paginated<ScrapRow>>(`/materials/scrap?${query.toString()}`, emptyPage<ScrapRow>()),
    partnerOptions(),
  ]);

  const generated = scrap.data.reduce((sum, row) => sum + row.scrapWeightKg, 0);
  const returned = scrap.data.reduce((sum, row) => sum + row.returnedWeightKg, 0);
  const outstanding = scrap.data.reduce((sum, row) => sum + row.outstandingKg, 0);

  const columns: Column<ScrapRow>[] = [
    {
      key: 'job',
      header: 'Job',
      render: (row) => (
        <a href={`/app/production/jobs/${row.jobId}`} className="block hover:underline">
          <span className="block font-medium">{row.jobNumber}</span>
          <span className="block text-xs text-muted-foreground">{row.partnerName ?? '—'}</span>
        </a>
      ),
    },
    {
      key: 'item',
      header: 'Material',
      render: (row) => (
        <span className="block">
          <span className="block">{row.itemName}</span>
          <span className="block font-mono text-xs text-muted-foreground">{row.itemCode}</span>
        </span>
      ),
    },
    {
      key: 'generated',
      header: 'Generated',
      align: 'right',
      render: (row) => <span className="tabular-nums">{formatNumber(row.scrapWeightKg)} kg</span>,
    },
    {
      key: 'returned',
      header: 'Returned',
      align: 'right',
      render: (row) => (
        <span className="tabular-nums">{formatNumber(row.returnedWeightKg)} kg</span>
      ),
    },
    {
      key: 'outstanding',
      header: 'Not returned',
      align: 'right',
      render: (row) => (
        <span
          className={
            row.outstandingKg > 0 ? 'font-medium tabular-nums text-destructive' : 'tabular-nums'
          }
        >
          {formatNumber(row.outstandingKg)} kg
        </span>
      ),
    },
    {
      key: 'percent',
      header: 'Scrap %',
      align: 'right',
      render: (row) => (
        <span
          className={
            row.scrapPercent >= HIGH_SCRAP_PERCENT
              ? 'font-medium tabular-nums text-amber-600'
              : 'tabular-nums'
          }
        >
          {row.scrapPercent.toFixed(1)}%
        </span>
      ),
    },
    { key: 'challan', header: 'Challan', render: (row) => row.challanNumber ?? '—' },
    { key: 'returnedAt', header: 'Returned on', render: (row) => formatDate(row.returnedAt) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scrap"
        description="Scrap generated at partners and what has come back. Unreturned scrap is OSWAR material that has left the network."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Generated" value={`${formatNumber(generated)} kg`} />
        <StatCard label="Returned" value={`${formatNumber(returned)} kg`} />
        <StatCard
          label="Not returned"
          value={`${formatNumber(outstanding)} kg`}
          hint="Recoverable material still outstanding"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scrap register</CardTitle>
          <CardDescription>
            Scrap percentage above {HIGH_SCRAP_PERCENT}% is flagged: it usually points at a
            nesting or process problem rather than normal loss.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchFilters
            searchPlaceholder="Search…"
            filters={[{ name: 'partnerId', label: 'Partner', options: partners }]}
          />
          <DataTable
            columns={columns}
            rows={scrap.data}
            empty={{
              title: 'No scrap recorded',
              description: 'Scrap returns appear here as partners record them against a job.',
            }}
          />
          <PaginationControls page={page} totalPages={scrap.totalPages} total={scrap.total} />
        </CardContent>
      </Card>
    </div>
  );
}
