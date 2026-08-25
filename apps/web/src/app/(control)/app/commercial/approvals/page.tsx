import { Check, X } from 'lucide-react';

import { DataTable, type Column } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { PaginationControls } from '@/components/app/pagination-controls';
import { SearchFilters } from '@/components/app/search-filters';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDateTime, humanise } from '@/lib/format';
import { readPage, readParam, type SearchParams } from '@/lib/query';
import { partnerOptions } from '@/lib/reference';
import { apiGet } from '@/lib/session';
import { emptyPage, type Paginated, type PaymentApprovalRow } from '@/lib/types';

export const metadata = { title: 'Approvals · GRID-X' };

const STAGES = [
  { value: 'QUANTITY', label: 'Quantity verified' },
  { value: 'QUALITY', label: 'Quality verified' },
  { value: 'MATERIAL', label: 'Material reconciled' },
  { value: 'FINANCE', label: 'Finance approved' },
];

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const page = readPage(searchParams);
  const query = new URLSearchParams({ page: String(page), pageSize: '25' });
  for (const key of ['stage', 'partnerId', 'approved']) {
    const value = readParam(searchParams, key);
    if (value) query.set(key, value);
  }

  const [approvals, partners] = await Promise.all([
    apiGet<Paginated<PaymentApprovalRow>>(
      `/commercials/approvals?${query.toString()}`,
      emptyPage<PaymentApprovalRow>(),
    ),
    partnerOptions(),
  ]);

  const rejected = approvals.data.filter((row) => !row.approved);

  const columns: Column<PaymentApprovalRow>[] = [
    {
      key: 'invoice',
      header: 'Invoice',
      render: (row) => (
        <a href={`/app/commercial/invoices/${row.invoiceId}`} className="block hover:underline">
          <span className="block font-medium">{row.invoiceNumber}</span>
          <span className="block text-xs text-muted-foreground">{row.partnerName ?? '—'}</span>
        </a>
      ),
    },
    {
      key: 'stage',
      header: 'Stage',
      render: (row) => humanise(row.stage),
    },
    {
      key: 'decision',
      header: 'Decision',
      render: (row) =>
        row.approved ? (
          <span className="inline-flex items-center gap-1.5 text-emerald-600">
            <Check className="h-4 w-4" /> Passed
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-destructive">
            <X className="h-4 w-4" /> Held
          </span>
        ),
    },
    { key: 'approver', header: 'By', render: (row) => row.approverName ?? '—' },
    {
      key: 'remarks',
      header: 'Remarks',
      render: (row) => (
        <span className="block max-w-xs text-muted-foreground">{row.remarks ?? '—'}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Net',
      align: 'right',
      render: (row) => <span className="tabular-nums">{formatCurrency(row.netAmount)}</span>,
    },
    {
      key: 'invoiceStatus',
      header: 'Invoice now',
      render: (row) => <StatusBadge status={row.invoiceStatus} />,
    },
    { key: 'at', header: 'When', render: (row) => formatDateTime(row.createdAt) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon="Wallet"
        title="Approvals"
        description="Who signed off each stage of every partner invoice, and what they said."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Decisions on this page" value={String(approvals.data.length)} />
        <StatCard label="Held" value={String(rejected.length)} hint="Stage not passed" />
        <StatCard label="Total recorded" value={String(approvals.total)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Approval trail</CardTitle>
          <CardDescription>
            Module 11&rsquo;s invoice workflow runs quantity → quality → material → finance. Every
            sign-off is recorded here, which is what makes a payment auditable after the fact.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchFilters
            searchPlaceholder="Search…"
            filters={[
              { name: 'stage', label: 'Stage', options: STAGES },
              { name: 'partnerId', label: 'Partner', options: partners },
              {
                name: 'approved',
                label: 'Decision',
                options: [
                  { value: 'true', label: 'Passed' },
                  { value: 'false', label: 'Held' },
                ],
              },
            ]}
          />
          <DataTable
            columns={columns}
            rows={approvals.data}
            empty={{
              title: 'No approvals recorded',
              description: 'Stage sign-offs appear here as invoices move through the workflow.',
            }}
          />
          <PaginationControls
            page={page}
            totalPages={approvals.totalPages}
            total={approvals.total}
          />
        </CardContent>
      </Card>
    </div>
  );
}
