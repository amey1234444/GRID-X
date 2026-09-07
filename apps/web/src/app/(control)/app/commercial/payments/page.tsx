import Link from 'next/link';

import { recordPaymentAction, scheduleInvoiceAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { DataTable, type Column } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';
import { optionsFrom } from '@/lib/options';
import { apiGet } from '@/lib/session';
import { emptyPage, type InvoiceRow, type Paginated } from '@/lib/types';
import { PAYMENT_MODES } from '@gridx/shared';

export const metadata = { title: 'Payments · GRID-X' };

export default async function PaymentsPage(): Promise<React.JSX.Element> {
  const invoices = await apiGet<Paginated<InvoiceRow>>('/commercials/invoices?pageSize=100', emptyPage<InvoiceRow>());

  const approved = invoices.data.filter((row) => row.status === 'FINANCE_APPROVED');
  const scheduled = invoices.data.filter((row) => row.status === 'PAYMENT_SCHEDULED');
  const paid = invoices.data.filter((row) => row.status === 'PAID');

  const columns = (withSchedule: boolean): Column<InvoiceRow>[] => [
    {
      key: 'invoice',
      header: 'Invoice',
      render: (row) => (
        <Link href={`/app/commercial/invoices/${row.id}`} className="font-medium text-primary hover:underline">
          {row.invoiceNumber}
        </Link>
      ),
    },
    { key: 'partner', header: 'Partner', render: (row) => row.partner.businessName },
    { key: 'net', header: 'Net amount', align: 'right', render: (row) => formatCurrency(row.netAmount) },
    {
      key: 'due',
      header: withSchedule ? 'Approved' : 'Scheduled for',
      render: (row) => formatDate(withSchedule ? row.financeApprovedAt : row.paymentScheduledFor),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <span className="flex flex-wrap gap-2">
          {withSchedule ? (
            <ActionDialog
              title="Schedule payment"
              triggerLabel="Schedule"
              triggerSize="sm"
              triggerVariant="outline"
              action={scheduleInvoiceAction}
              hidden={{ invoiceId: row.id }}
              fields={[{ name: 'paymentScheduledFor', label: 'Payment date', type: 'date', required: true, span: 2 }]}
            />
          ) : null}
          <ActionDialog
            title="Record payment"
            triggerLabel="Pay"
            triggerSize="sm"
            action={recordPaymentAction}
            hidden={{ invoiceId: row.id }}
            fields={[
              { name: 'amount', label: 'Amount', type: 'number', step: '0.01', required: true, defaultValue: String(row.netAmount) },
              { name: 'mode', label: 'Mode', type: 'select', options: optionsFrom(PAYMENT_MODES), defaultValue: 'NEFT' },
              { name: 'referenceNo', label: 'UTR / reference' },
              { name: 'paidAt', label: 'Paid at', type: 'date' },
            ]}
          />
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon="Wallet"
        title="Payments"
        description="Finance-approved invoices waiting to be scheduled and paid, with the payment register."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Approved, unscheduled" value={formatNumber(approved.length)} tone="warning" />
        <StatCard label="Scheduled" value={formatNumber(scheduled.length)} />
        <StatCard
          label="Due to partners"
          value={formatCurrency([...approved, ...scheduled].reduce((sum, row) => sum + row.netAmount, 0))}
        />
        <StatCard label="Paid" value={formatCurrency(paid.reduce((sum, row) => sum + row.netAmount, 0))} tone="success" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Approved — awaiting schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns(true)} rows={approved} empty={{ title: 'Nothing awaiting schedule' }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scheduled payments</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns(false)} rows={scheduled} empty={{ title: 'No scheduled payments' }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment register</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              {
                key: 'invoice',
                header: 'Invoice',
                render: (row: InvoiceRow) => (
                  <Link href={`/app/commercial/invoices/${row.id}`} className="text-primary hover:underline">
                    {row.invoiceNumber}
                  </Link>
                ),
              },
              { key: 'partner', header: 'Partner', render: (row: InvoiceRow) => row.partner.businessName },
              { key: 'net', header: 'Amount', align: 'right', render: (row: InvoiceRow) => formatCurrency(row.netAmount) },
              { key: 'paidAt', header: 'Paid', render: (row: InvoiceRow) => formatDate(row.paidAt) },
              {
                key: 'mode',
                header: 'Mode',
                render: (row: InvoiceRow) => (row.payments[0] ? row.payments[0].mode : '—'),
              },
              {
                key: 'reference',
                header: 'Reference',
                render: (row: InvoiceRow) => row.payments[0]?.reference ?? '—',
              },
              { key: 'status', header: 'Status', render: (row: InvoiceRow) => <StatusBadge status={row.status} /> },
            ]}
            rows={paid}
            empty={{ title: 'No payments yet' }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
