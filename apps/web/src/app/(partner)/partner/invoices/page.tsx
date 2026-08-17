import { submitInvoiceAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { EmptyState } from '@/components/app/empty-state';
import { PageHeader } from '@/components/app/page-header';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';
import { readPage, type SearchParams } from '@/lib/query';
import { apiGet, currentUser } from '@/lib/session';
import { emptyPage, type InvoiceRow, type InvoiceableJob, type Paginated } from '@/lib/types';

export const metadata = { title: 'Invoices · GRID-X Partner' };

export default async function PartnerInvoicesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const page = readPage(searchParams);
  const user = await currentUser();
  const hindi = user?.language === 'HI';

  const [invoices, invoiceable] = await Promise.all([
    apiGet<Paginated<InvoiceRow>>(`/commercials/invoices?page=${page}&pageSize=20`, emptyPage<InvoiceRow>()),
    user?.partnerId
      ? apiGet<InvoiceableJob[]>(`/commercials/invoices/invoiceable-jobs?partnerId=${user.partnerId}`, [])
      : Promise.resolve<InvoiceableJob[]>([]),
  ]);

  const invoiceableValue = invoiceable.reduce((sum, job) => sum + job.amount, 0);
  const awaitingPayment = invoices.data
    .filter((invoice) => invoice.paidAt === null)
    .reduce((sum, invoice) => sum + invoice.netAmount, 0);
  const paid = invoices.data
    .filter((invoice) => invoice.paidAt !== null)
    .reduce((sum, invoice) => sum + invoice.netAmount, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title={hindi ? 'बिल' : 'Invoices'}
        description={
          hindi
            ? 'सिर्फ़ स्वीकृत मात्रा पर बिल बनता है। हर चरण की स्थिति यहाँ दिखती है।'
            : 'Invoices are raised on accepted quantity only. Every verification stage is visible here.'
        }
        actions={
          <ActionDialog
            title={hindi ? 'नया बिल' : 'Submit an invoice'}
            description={
              hindi
                ? 'स्वीकृत काम चुनें। बिल की राशि स्वीकृत मात्रा × दर से बनती है।'
                : 'Select the accepted jobs to bill. The amount is computed from accepted quantity × conversion rate.'
            }
            triggerLabel={hindi ? 'बिल भेजें' : 'Submit invoice'}
            submitLabel={hindi ? 'भेजें' : 'Submit'}
            action={submitInvoiceAction}
            hidden={{ partnerId: user?.partnerId ?? undefined }}
            disabled={invoiceable.length === 0}
            fields={[
              {
                name: 'jobIds',
                label: hindi ? 'स्वीकृत काम' : 'Accepted jobs',
                type: 'multiselect',
                span: 2,
                options: invoiceable.map((job) => ({
                  value: job.jobId,
                  label: `${job.jobNumber} · ${job.componentCode} · ${formatNumber(job.acceptedQuantity)} × ${formatCurrency(job.conversionRate)} = ${formatCurrency(job.amount)}`,
                })),
              },
              { name: 'partnerInvoiceNo', label: hindi ? 'आपका बिल नंबर' : 'Your invoice number', required: true },
              { name: 'taxPercent', label: hindi ? 'जीएसटी %' : 'GST %', type: 'number', defaultValue: '18' },
              { name: 'periodFrom', label: hindi ? 'से' : 'Period from', type: 'date', required: true },
              { name: 'periodTo', label: hindi ? 'तक' : 'Period to', type: 'date', required: true },
              {
                name: 'fileId',
                label: hindi ? 'बिल की कॉपी' : 'Invoice copy',
                type: 'file',
                category: 'INVOICE',
                accept: 'application/pdf,image/*',
                span: 2,
              },
            ]}
          />
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label={hindi ? 'बिल बनने योग्य' : 'Ready to invoice'} value={formatCurrency(invoiceableValue)} />
        <StatCard label={hindi ? 'भुगतान बाकी' : 'Awaiting payment'} value={formatCurrency(awaitingPayment)} tone={awaitingPayment > 0 ? 'warning' : 'default'} />
        <StatCard label={hindi ? 'भुगतान हुआ' : 'Paid'} value={formatCurrency(paid)} tone="success" />
      </div>

      {invoices.data.length === 0 ? (
        <EmptyState
          title={hindi ? 'कोई बिल नहीं' : 'No invoices yet'}
          description={
            hindi
              ? 'जाँच में स्वीकृत मात्रा पर बिल भेजें।'
              : 'Submit an invoice once a batch has been accepted by quality.'
          }
        />
      ) : (
        <ul className="space-y-3">
          {invoices.data.map((invoice) => (
            <li key={invoice.id}>
              <Card>
                <CardContent className="space-y-3 pt-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{invoice.invoiceNumber}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {invoice.partnerInvoiceNo ? `${invoice.partnerInvoiceNo} · ` : ''}
                        {formatDate(invoice.periodFrom)} – {formatDate(invoice.periodTo)}
                      </p>
                    </div>
                    <span className="text-sm font-medium">{formatCurrency(invoice.netAmount)}</span>
                    <StatusBadge status={invoice.status} />
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {[
                      { label: hindi ? 'मात्रा जाँच' : 'Quantity', at: invoice.quantityVerifiedAt },
                      { label: hindi ? 'गुणवत्ता' : 'Quality', at: invoice.qualityVerifiedAt },
                      { label: hindi ? 'माल हिसाब' : 'Material', at: invoice.materialReconciledAt },
                      { label: hindi ? 'वित्त मंज़ूरी' : 'Finance', at: invoice.financeApprovedAt },
                      { label: hindi ? 'भुगतान' : 'Paid', at: invoice.paidAt },
                    ].map((stage) => (
                      <span
                        key={stage.label}
                        className={
                          stage.at
                            ? 'rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-600'
                            : 'rounded-full bg-secondary px-2.5 py-1 text-muted-foreground'
                        }
                      >
                        {stage.label}
                        {stage.at ? ` · ${formatDate(stage.at)}` : ''}
                      </span>
                    ))}
                  </div>
                  {invoice.deductionAmount > 0 ? (
                    <p className="text-xs text-destructive">
                      {hindi ? 'कटौती' : 'Deductions'}: {formatCurrency(invoice.deductionAmount)}
                    </p>
                  ) : null}
                  {invoice.holdReason ? (
                    <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{invoice.holdReason}</p>
                  ) : null}
                  {invoice.paymentScheduledFor && !invoice.paidAt ? (
                    <p className="text-xs text-muted-foreground">
                      {hindi ? 'भुगतान तारीख' : 'Payment scheduled'}: {formatDate(invoice.paymentScheduledFor)}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
