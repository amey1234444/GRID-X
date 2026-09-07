import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DEDUCTION_TYPES, INVOICE_STAGE_ORDER, PAYMENT_MODES } from '@gridx/shared';

import {
  createDeductionAction,
  holdInvoiceAction,
  invoiceStageAction,
  recordPaymentAction,
  scheduleInvoiceAction,
} from '@/app/actions/control';
import { ActivityTrail } from '@/components/app/activity-trail';
import { ActionDialog } from '@/components/app/action-dialog';
import { DataTable } from '@/components/app/data-table';
import { DetailList } from '@/components/app/detail-list';
import { PageHeader } from '@/components/app/page-header';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate, formatDateTime, formatNumber, humanise } from '@/lib/format';
import { optionsFrom } from '@/lib/options';
import { apiFetch } from '@/lib/session';
import type { InvoiceRow } from '@/lib/types';

const STAGE_ACTIONS: { stage: string; label: string; from: string }[] = [
  { stage: 'quantity', label: 'Verify quantity', from: 'RAISED' },
  { stage: 'quality', label: 'Verify quality', from: 'QUANTITY_VERIFIED' },
  { stage: 'material', label: 'Reconcile material', from: 'QUALITY_VERIFIED' },
  { stage: 'approve', label: 'Finance approve', from: 'MATERIAL_RECONCILED' },
];

export default async function InvoiceDetailPage({ params }: { params: { id: string } }): Promise<React.JSX.Element> {
  const result = await apiFetch<InvoiceRow>(`/commercials/invoices/${params.id}`);
  const invoice = result.data;
  if (!invoice) notFound();

  const stage = STAGE_ACTIONS.find((item) => item.from === invoice.status);
  const paid = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        icon="Wallet"
        title={invoice.invoiceNumber}
        description={`${invoice.partner.businessName} · ${formatDate(invoice.periodFrom)} → ${formatDate(invoice.periodTo)}`}
        actions={
          <>
            {stage ? (
              <ActionDialog
                title={stage.label}
                triggerLabel={stage.label}
                action={invoiceStageAction}
                hidden={{ invoiceId: invoice.id, stage: stage.stage }}
                fields={[{ name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 }]}
              />
            ) : null}
            {invoice.status === 'FINANCE_APPROVED' ? (
              <ActionDialog
                title="Schedule payment"
                triggerLabel="Schedule payment"
                action={scheduleInvoiceAction}
                hidden={{ invoiceId: invoice.id }}
                fields={[{ name: 'paymentScheduledFor', label: 'Payment date', type: 'date', required: true, span: 2 }]}
              />
            ) : null}
            {invoice.status === 'PAYMENT_SCHEDULED' || invoice.status === 'FINANCE_APPROVED' ? (
              <ActionDialog
                title="Record payment"
                triggerLabel="Record payment"
                triggerVariant="secondary"
                action={recordPaymentAction}
                hidden={{ invoiceId: invoice.id }}
                fields={[
                  { name: 'amount', label: 'Amount', type: 'number', step: '0.01', required: true },
                  { name: 'mode', label: 'Mode', type: 'select', options: optionsFrom(PAYMENT_MODES), defaultValue: 'NEFT' },
                  { name: 'referenceNo', label: 'UTR / reference' },
                  { name: 'paidAt', label: 'Paid at', type: 'date' },
                  { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
                ]}
              />
            ) : null}
            {invoice.status !== 'PAID' ? (
              <ActionDialog
                title="Hold invoice"
                triggerLabel="Hold"
                triggerVariant="outline"
                action={holdInvoiceAction}
                hidden={{ invoiceId: invoice.id }}
                fields={[{ name: 'holdReason', label: 'Hold reason', type: 'textarea', required: true, span: 2 }]}
              />
            ) : null}
            <ActionDialog
              title="Add deduction"
              triggerLabel="Add deduction"
              triggerVariant="ghost"
              action={createDeductionAction}
              hidden={{ invoiceId: invoice.id, partnerId: invoice.partner.id }}
              fields={[
                { name: 'type', label: 'Type', type: 'select', required: true, options: optionsFrom(DEDUCTION_TYPES), span: 2 },
                { name: 'amount', label: 'Amount', type: 'number', step: '0.01', required: true },
                { name: 'reason', label: 'Reason', required: true },
              ]}
            />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Status" value={humanise(invoice.status)} tone={invoice.status === 'HELD' ? 'destructive' : 'default'} />
        <StatCard label="Net payable" value={formatCurrency(invoice.netAmount)} />
        <StatCard label="Paid" value={formatCurrency(paid)} tone={paid >= invoice.netAmount ? 'success' : 'default'} />
        <StatCard label="Balance" value={formatCurrency(invoice.netAmount - paid)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Approval pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {INVOICE_STAGE_ORDER.map((item) => {
              const reached = INVOICE_STAGE_ORDER.indexOf(item) <= INVOICE_STAGE_ORDER.indexOf(invoice.status as never);
              return (
                <li
                  key={item}
                  className={`rounded-lg border p-3 text-xs ${reached ? 'border-primary/40 bg-primary/5 text-primary' : 'text-muted-foreground'}`}
                >
                  {humanise(item)}
                </li>
              );
            })}
          </ol>
          {invoice.holdReason ? (
            <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              On hold: {invoice.holdReason}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList
            columns={3}
            items={[
              {
                label: 'Partner',
                value: (
                  <Link href={`/app/partners/${invoice.partner.id}`} className="text-primary hover:underline">
                    {invoice.partner.businessName}
                  </Link>
                ),
              },
              { label: 'Partner invoice no', value: invoice.partnerInvoiceNo ?? '—' },
              { label: 'Invoice date', value: formatDate(invoice.invoiceDate) },
              { label: 'Basic amount', value: formatCurrency(invoice.basicAmount) },
              { label: 'Incentives', value: formatCurrency(invoice.incentiveAmount) },
              { label: 'Deductions', value: formatCurrency(invoice.deductionAmount) },
              { label: 'Tax', value: formatCurrency(invoice.taxAmount) },
              { label: 'Quantity verified', value: formatDateTime(invoice.quantityVerifiedAt) },
              { label: 'Quality verified', value: formatDateTime(invoice.qualityVerifiedAt) },
              { label: 'Material reconciled', value: formatDateTime(invoice.materialReconciledAt) },
              { label: 'Finance approved', value: formatDateTime(invoice.financeApprovedAt) },
              { label: 'Scheduled for', value: formatDate(invoice.paymentScheduledFor) },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice lines</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              {
                key: 'description',
                header: 'Description',
                render: (row: InvoiceRow['items'][number]) => row.description ?? row.jobId ?? '—',
              },
              {
                key: 'qty',
                header: 'Accepted qty',
                align: 'right',
                render: (row: InvoiceRow['items'][number]) => formatNumber(row.acceptedQuantity),
              },
              {
                key: 'rate',
                header: 'Rate',
                align: 'right',
                render: (row: InvoiceRow['items'][number]) => formatCurrency(row.conversionRate),
              },
              {
                key: 'amount',
                header: 'Amount',
                align: 'right',
                render: (row: InvoiceRow['items'][number]) => formatCurrency(row.amount),
              },
            ]}
            rows={invoice.items}
            empty={{ title: 'No invoice lines' }}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                {
                  key: 'paidAt',
                  header: 'Paid at',
                  render: (row: InvoiceRow['payments'][number]) => formatDate(row.paidAt),
                },
                {
                  key: 'amount',
                  header: 'Amount',
                  align: 'right',
                  render: (row: InvoiceRow['payments'][number]) => formatCurrency(row.amount),
                },
                { key: 'mode', header: 'Mode', render: (row: InvoiceRow['payments'][number]) => humanise(row.mode) },
                {
                  key: 'reference',
                  header: 'Reference',
                  render: (row: InvoiceRow['payments'][number]) => row.reference ?? '—',
                },
              ]}
              rows={invoice.payments}
              empty={{ title: 'No payments recorded' }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                {
                  key: 'stage',
                  header: 'Stage',
                  render: (row: NonNullable<InvoiceRow['approvals']>[number]) => humanise(row.stage),
                },
                {
                  key: 'decision',
                  header: 'Decision',
                  render: (row: NonNullable<InvoiceRow['approvals']>[number]) => <StatusBadge status={row.decision} />,
                },
                {
                  key: 'remarks',
                  header: 'Remarks',
                  render: (row: NonNullable<InvoiceRow['approvals']>[number]) => row.remarks ?? '—',
                },
                {
                  key: 'when',
                  header: 'When',
                  render: (row: NonNullable<InvoiceRow['approvals']>[number]) => formatDateTime(row.createdAt),
                },
              ]}
              rows={invoice.approvals ?? []}
              empty={{ title: 'No approvals yet' }}
            />
          </CardContent>
        </Card>
      </div>

      <ActivityTrail entityType="PartnerInvoice" entityId={invoice.id} />
    </div>
  );
}
