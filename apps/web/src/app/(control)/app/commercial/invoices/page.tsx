import { INVOICE_STATUSES } from '@gridx/shared';

import { submitInvoiceAction } from '@/app/actions/control';
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
import { jobOptions, partnerOptions } from '@/lib/reference';
import { apiGet } from '@/lib/session';
import { emptyPage, type InvoiceRow, type Paginated } from '@/lib/types';

export const metadata = { title: 'Invoices · GRID-X' };

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const page = readPage(searchParams);
  const query = new URLSearchParams({ page: String(page), pageSize: '25' });
  for (const key of ['search', 'status', 'partnerId']) {
    const value = readParam(searchParams, key);
    if (value) query.set(key, value);
  }

  const [invoices, partners, jobs] = await Promise.all([
    apiGet<Paginated<InvoiceRow>>(`/commercials/invoices?${query.toString()}`, emptyPage<InvoiceRow>()),
    partnerOptions(),
    jobOptions(),
  ]);

  const outstanding = invoices.data
    .filter((row) => row.status !== 'PAID' && row.status !== 'REJECTED')
    .reduce((sum, row) => sum + row.netAmount, 0);

  const columns: Column<InvoiceRow>[] = [
    {
      key: 'invoice',
      header: 'Invoice',
      render: (row) => (
        <span className="block">
          <span className="block font-medium">{row.invoiceNumber}</span>
          <span className="block text-xs text-muted-foreground">
            {row.partnerInvoiceNo ?? '—'} · {formatDate(row.invoiceDate)}
          </span>
        </span>
      ),
    },
    { key: 'partner', header: 'Partner', render: (row) => row.partner.businessName },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'period',
      header: 'Period',
      render: (row) => `${formatDate(row.periodFrom)} → ${formatDate(row.periodTo)}`,
    },
    { key: 'basic', header: 'Basic', align: 'right', render: (row) => formatCurrency(row.basicAmount) },
    {
      key: 'adjustments',
      header: 'Incentive / deduction',
      align: 'right',
      render: (row) => `${formatCurrency(row.incentiveAmount)} / ${formatCurrency(row.deductionAmount)}`,
    },
    { key: 'net', header: 'Net', align: 'right', render: (row) => <span className="font-medium">{formatCurrency(row.netAmount)}</span> },
    { key: 'paid', header: 'Paid', render: (row) => (row.paidAt ? formatDate(row.paidAt) : '—') },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon="Wallet"
        title="Partner invoices"
        description="Invoices are built from accepted quantity only and move through quantity, quality, material and finance verification."
        actions={
          <ActionDialog
            title="Raise partner invoice"
            description="Select the accepted jobs to bill. Amounts are computed from accepted quantity × active rate."
            triggerLabel="Raise invoice"
            action={submitInvoiceAction}
            fields={[
              { name: 'partnerId', label: 'Partner', type: 'select', required: true, options: partners, span: 2 },
              { name: 'partnerInvoiceNo', label: 'Partner invoice number' },
              { name: 'taxPercent', label: 'Tax %', type: 'number', step: '0.01', defaultValue: '18' },
              { name: 'periodFrom', label: 'Period from', type: 'date' },
              { name: 'periodTo', label: 'Period to', type: 'date' },
              { name: 'jobIds', label: 'Jobs', type: 'multiselect', required: true, options: jobs, span: 2 },
            ]}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Invoices" value={formatNumber(invoices.total)} />
        <StatCard
          label="Awaiting verification"
          value={formatNumber(
            invoices.data.filter((row) => ['RAISED', 'QUANTITY_VERIFIED', 'QUALITY_VERIFIED'].includes(row.status)).length,
          )}
          tone="warning"
        />
        <StatCard label="Outstanding" value={formatCurrency(outstanding)} />
        <StatCard
          label="Held"
          value={formatNumber(invoices.data.filter((row) => row.status === 'HELD').length)}
          tone="destructive"
        />
      </div>

      <SearchFilters
        searchPlaceholder="Search by invoice number or partner…"
        filters={[
          { name: 'status', label: 'Status', options: optionsFrom(INVOICE_STATUSES) },
          { name: 'partnerId', label: 'Partner', options: partners },
        ]}
      />

      <DataTable
        columns={columns}
        rows={invoices.data}
        rowHref={(row) => `/app/commercial/invoices/${row.id}`}
        empty={{ title: 'No invoices', description: 'Invoices are raised once jobs are quality accepted.' }}
      />

      <PaginationControls page={invoices.page} totalPages={invoices.totalPages} total={invoices.total} />
    </div>
  );
}
