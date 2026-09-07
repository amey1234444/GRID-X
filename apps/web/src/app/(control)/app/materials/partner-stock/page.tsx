import { DataTable, type Column } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { SearchFilters } from '@/components/app/search-filters';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@/lib/format';
import { readParam, type SearchParams } from '@/lib/query';
import { partnerOptions } from '@/lib/reference';
import { apiGet } from '@/lib/session';
import type { PartnerStock } from '@/lib/types';

export const metadata = { title: 'Partner stock · GRID-X' };

/** Material out this long without reconciling is worth chasing before it becomes a write-off. */
const STALE_DAYS = 45;

export default async function PartnerStockPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const query = new URLSearchParams();
  const partnerId = readParam(searchParams, 'partnerId');
  if (partnerId) query.set('partnerId', partnerId);

  const [stock, partners] = await Promise.all([
    apiGet<PartnerStock>(`/materials/partner-stock?${query.toString()}`, {
      rows: [],
      totals: { issuedKg: 0, balanceKg: 0, partners: 0 },
    }),
    partnerOptions(),
  ]);

  const stale = stock.rows.filter((row) => (row.daysHeld ?? 0) >= STALE_DAYS);

  const columns: Column<PartnerStock['rows'][number]>[] = [
    {
      key: 'partner',
      header: 'Partner',
      render: (row) => (
        <a href={`/app/partners/${row.partnerId}`} className="font-medium hover:underline">
          {row.partnerName}
        </a>
      ),
    },
    {
      key: 'job',
      header: 'Job',
      render: (row) => (
        <a href={`/app/production/jobs/${row.jobId}`} className="block hover:underline">
          <span className="block">{row.jobNumber}</span>
          <StatusBadge status={row.jobStatus} className="scale-90" />
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
      key: 'issued',
      header: 'Issued',
      align: 'right',
      render: (row) => <span className="tabular-nums">{formatNumber(row.issuedKg)} kg</span>,
    },
    {
      key: 'consumed',
      header: 'Consumed',
      align: 'right',
      render: (row) => <span className="tabular-nums">{formatNumber(row.consumedKg)} kg</span>,
    },
    {
      key: 'scrap',
      header: 'Scrap back',
      align: 'right',
      render: (row) => (
        <span className="tabular-nums">{formatNumber(row.scrapReturnedKg)} kg</span>
      ),
    },
    {
      key: 'balance',
      header: 'Still out',
      align: 'right',
      render: (row) => (
        <span className="font-medium tabular-nums">{formatNumber(row.balanceKg)} kg</span>
      ),
    },
    {
      key: 'held',
      header: 'Held',
      align: 'right',
      render: (row) =>
        row.daysHeld === null ? (
          '—'
        ) : (
          <span
            className={
              row.daysHeld >= STALE_DAYS ? 'font-medium tabular-nums text-destructive' : 'tabular-nums'
            }
          >
            {row.daysHeld}d
          </span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon="Boxes"
        title="Partner stock"
        description="OSWAR material currently sitting in partner workshops, by job and item."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Still with partners"
          value={`${formatNumber(stock.totals.balanceKg)} kg`}
          hint={`Across ${stock.totals.partners} partner(s)`}
        />
        <StatCard label="Total issued" value={`${formatNumber(stock.totals.issuedKg)} kg`} />
        <StatCard
          label={`Out over ${STALE_DAYS} days`}
          value={String(stale.length)}
          hint="Worth chasing before it is written off"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Material under partner custody</CardTitle>
          <CardDescription>
            Balance is what was issued, less what production consumed and what came back as scrap.
            Only lines with something still outstanding are shown.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchFilters
            searchPlaceholder="Search…"
            filters={[{ name: 'partnerId', label: 'Partner', options: partners }]}
          />
          <DataTable
            columns={columns}
            rows={stock.rows}
            empty={{
              title: 'Nothing outstanding',
              description: 'Every issued batch has been consumed or reconciled.',
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
