import Link from 'next/link';

import { recordConsumptionAction, recordScrapAction, reconcileMaterialAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { DataTable } from '@/components/app/data-table';
import { EmptyState } from '@/components/app/empty-state';
import { PageHeader } from '@/components/app/page-header';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatNumber } from '@/lib/format';
import { readParam, type SearchParams } from '@/lib/query';
import { itemOptions, jobOptions } from '@/lib/reference';
import { apiGet } from '@/lib/session';
import { emptyPage, type MaterialIssueRow, type Paginated, type ReconciliationRow } from '@/lib/types';

export const metadata = { title: 'Material reconciliation · GRID-X' };

export default async function ReconciliationPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const jobId = readParam(searchParams, 'jobId');

  const [jobs, items, issues] = await Promise.all([
    jobOptions(),
    itemOptions(),
    apiGet<Paginated<MaterialIssueRow>>('/materials/issues?pageSize=50', emptyPage<MaterialIssueRow>()),
  ]);

  const rows = jobId ? await apiGet<ReconciliationRow[]>(`/materials/jobs/${jobId}/reconciliation`, []) : [];
  const shortage = rows.filter((row) => row.balanceKg > 0.001);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Material reconciliation"
        description="Issued versus consumed, scrap returned and unused material — the gate before payment approval."
        actions={
          jobId ? (
            <>
              <ActionDialog
                title="Record consumption"
                triggerLabel="Record consumption"
                action={recordConsumptionAction}
                hidden={{ jobId }}
                fields={[
                  { name: 'itemId', label: 'Item', type: 'select', required: true, options: items, span: 2 },
                  { name: 'theoreticalKg', label: 'Theoretical (kg)', type: 'number', step: '0.001' },
                  { name: 'actualKg', label: 'Actual consumed (kg)', type: 'number', step: '0.001', required: true },
                  { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
                ]}
              />
              <ActionDialog
                title="Record scrap return"
                triggerLabel="Record scrap"
                triggerVariant="outline"
                action={recordScrapAction}
                hidden={{ jobId }}
                fields={[
                  { name: 'itemId', label: 'Item', type: 'select', required: true, options: items, span: 2 },
                  { name: 'scrapWeightKg', label: 'Scrap weight (kg)', type: 'number', step: '0.001', required: true },
                  { name: 'returnedWeightKg', label: 'Returned weight (kg)', type: 'number', step: '0.001' },
                  { name: 'challanNumber', label: 'Return challan number' },
                  { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
                ]}
              />
              <ActionDialog
                title="Reconcile"
                description="Reconciliation records shortage or excess and creates a deduction where the partner is responsible."
                triggerLabel="Reconcile"
                triggerVariant="secondary"
                action={reconcileMaterialAction}
                hidden={{ jobId }}
                fields={[
                  { name: 'itemId', label: 'Item', type: 'select', required: true, options: items, span: 2 },
                  {
                    name: 'unusedReturnedKg',
                    label: 'Unused returned (kg)',
                    type: 'number',
                    step: '0.001',
                    help: 'Any shortage deduction is calculated from the item rate automatically.',
                  },
                  { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
                ]}
              />
            </>
          ) : null
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Select a job</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {jobs.slice(0, 40).map((option) => (
              <Link
                key={option.value}
                href={`/app/materials/reconciliation?jobId=${option.value}`}
                className={`rounded-full border px-3 py-1 text-xs transition hover:bg-secondary ${
                  option.value === jobId ? 'border-primary bg-primary/10 text-primary' : ''
                }`}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {jobId === undefined ? (
        <EmptyState
          title="Pick a job to reconcile"
          description="Reconciliation is per job and item: issued = consumed + scrap + unused returned."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Items" value={formatNumber(rows.length)} />
            <StatCard
              label="Issued (kg)"
              value={formatNumber(rows.reduce((sum, row) => sum + row.issuedKg, 0), 3)}
            />
            <StatCard
              label="Consumed (kg)"
              value={formatNumber(rows.reduce((sum, row) => sum + row.consumedKg, 0), 3)}
            />
            <StatCard
              label="Unaccounted (kg)"
              value={formatNumber(rows.reduce((sum, row) => sum + row.balanceKg, 0), 3)}
              tone={shortage.length > 0 ? 'destructive' : 'success'}
            />
          </div>

          <DataTable
            columns={[
              {
                key: 'item',
                header: 'Item',
                render: (row: ReconciliationRow) => `${row.itemCode} — ${row.itemName}`,
              },
              { key: 'issued', header: 'Issued', align: 'right', render: (row: ReconciliationRow) => formatNumber(row.issuedKg, 3) },
              { key: 'consumed', header: 'Consumed', align: 'right', render: (row: ReconciliationRow) => formatNumber(row.consumedKg, 3) },
              { key: 'scrap', header: 'Scrap returned', align: 'right', render: (row: ReconciliationRow) => formatNumber(row.scrapReturnedKg, 3) },
              { key: 'unused', header: 'Unused returned', align: 'right', render: (row: ReconciliationRow) => formatNumber(row.unusedReturnedKg, 3) },
              {
                key: 'balance',
                header: 'Unaccounted',
                align: 'right',
                render: (row: ReconciliationRow) => (
                  <span className={Math.abs(row.balanceKg) > 0.001 ? 'font-medium text-destructive' : undefined}>
                    {formatNumber(row.balanceKg, 3)}
                  </span>
                ),
              },
              {
                key: 'deduction',
                header: 'Deduction',
                align: 'right',
                render: (row: ReconciliationRow) => formatCurrency(row.deductionAmount),
              },
              { key: 'status', header: 'Status', render: (row: ReconciliationRow) => <StatusBadge status={row.status} /> },
            ]}
            rows={rows}
            empty={{ title: 'No material issued for this job' }}
          />
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent challans</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'challan', header: 'Challan', render: (row: MaterialIssueRow) => row.challanNumber },
              { key: 'job', header: 'Job', render: (row: MaterialIssueRow) => row.job?.jobNumber ?? '—' },
              { key: 'partner', header: 'Partner', render: (row: MaterialIssueRow) => row.partner?.businessName ?? '—' },
              { key: 'status', header: 'Status', render: (row: MaterialIssueRow) => <StatusBadge status={row.status} /> },
              {
                key: 'weight',
                header: 'Weight (kg)',
                align: 'right',
                render: (row: MaterialIssueRow) => formatNumber(row.totalIssueWeightKg, 3),
              },
            ]}
            rows={issues.data.slice(0, 10)}
            rowHref={(row) => `/app/materials/issues/${row.id}`}
            empty={{ title: 'No challans yet' }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
