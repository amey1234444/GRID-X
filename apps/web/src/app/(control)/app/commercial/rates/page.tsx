import { createRateAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { DataTable, type Column } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { PaginationControls } from '@/components/app/pagination-controls';
import { SearchFilters } from '@/components/app/search-filters';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';
import { readPage, readParam, type SearchParams } from '@/lib/query';
import { componentOptions, defaultCompanyId, partnerOptions } from '@/lib/reference';
import { apiGet } from '@/lib/session';
import { emptyPage, type Paginated, type RateRow } from '@/lib/types';

export const metadata = { title: 'Conversion rates · GRID-X' };

export default async function RatesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const page = readPage(searchParams);
  const query = new URLSearchParams({ page: String(page), pageSize: '25' });
  for (const key of ['search', 'partnerId', 'componentId']) {
    const value = readParam(searchParams, key);
    if (value) query.set(key, value);
  }

  const [rates, partners, components, companyId] = await Promise.all([
    apiGet<Paginated<RateRow>>(`/commercials/rates?${query.toString()}`, emptyPage<RateRow>()),
    partnerOptions(),
    componentOptions(),
    defaultCompanyId(),
  ]);

  const columns: Column<RateRow>[] = [
    { key: 'partner', header: 'Partner', render: (row) => <span className="font-medium">{row.partner.businessName}</span> },
    {
      key: 'component',
      header: 'Component',
      render: (row) => (
        <span className="block">
          <span className="block">{row.component.componentCode}</span>
          <span className="block text-xs text-muted-foreground">{row.component.name}</span>
        </span>
      ),
    },
    { key: 'rate', header: 'Rate', align: 'right', render: (row) => formatCurrency(row.conversionRate) },
    {
      key: 'previous',
      header: 'Previous',
      align: 'right',
      render: (row) => (row.previousRate === null ? '—' : formatCurrency(row.previousRate)),
    },
    { key: 'batch', header: 'Min batch', align: 'right', render: (row) => formatNumber(row.minimumBatch) },
    {
      key: 'window',
      header: 'Effective',
      render: (row) => `${formatDate(row.effectiveFrom)} → ${row.effectiveTo ? formatDate(row.effectiveTo) : 'open'}`,
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.isActive ? 'ACTIVE' : 'SUPERSEDED'} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon="Wallet"
        title="Conversion rates"
        description="Partner and component rate cards with revision history — invoices are always computed from the active rate."
        actions={
          <ActionDialog
            title="Add rate"
            description="A new rate supersedes the previous active rate for that partner and component."
            triggerLabel="Add rate"
            action={createRateAction}
            hidden={{ companyId }}
            fields={[
              { name: 'partnerId', label: 'Partner', type: 'select', required: true, options: partners, span: 2 },
              { name: 'componentId', label: 'Component', type: 'select', required: true, options: components, span: 2 },
              { name: 'conversionRate', label: 'Conversion rate', type: 'number', step: '0.01', required: true },
              { name: 'minimumBatch', label: 'Minimum batch', type: 'number', defaultValue: '1' },
              { name: 'effectiveFrom', label: 'Effective from', type: 'date', required: true },
              { name: 'effectiveTo', label: 'Effective to', type: 'date' },
              { name: 'revisionNote', label: 'Revision note', type: 'textarea', span: 2 },
            ]}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Rate records" value={formatNumber(rates.total)} />
        <StatCard label="Active" value={formatNumber(rates.data.filter((row) => row.isActive).length)} />
        <StatCard
          label="Average rate"
          value={
            rates.data.length === 0
              ? '—'
              : formatCurrency(rates.data.reduce((sum, row) => sum + row.conversionRate, 0) / rates.data.length)
          }
        />
      </div>

      <SearchFilters
        searchPlaceholder="Search by partner or component…"
        filters={[
          { name: 'partnerId', label: 'Partner', options: partners },
          { name: 'componentId', label: 'Component', options: components },
        ]}
      />

      <DataTable columns={columns} rows={rates.data} empty={{ title: 'No rates', description: 'Add a rate card before allocating jobs.' }} />

      <PaginationControls page={rates.page} totalPages={rates.totalPages} total={rates.total} />
    </div>
  );
}
