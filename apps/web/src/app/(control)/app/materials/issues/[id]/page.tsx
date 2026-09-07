import Link from 'next/link';
import { notFound } from 'next/navigation';

import { acknowledgeMaterialAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { DataTable } from '@/components/app/data-table';
import { DetailList } from '@/components/app/detail-list';
import { PageHeader } from '@/components/app/page-header';
import { StatusBadge } from '@/components/app/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, formatDateTime, formatNumber } from '@/lib/format';
import { apiFetch } from '@/lib/session';
import type { MaterialIssueRow } from '@/lib/types';

export default async function MaterialIssueDetailPage({
  params,
}: {
  params: { id: string };
}): Promise<React.JSX.Element> {
  const result = await apiFetch<MaterialIssueRow>(`/materials/issues/${params.id}`);
  const issue = result.data;
  if (!issue) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        icon="Boxes"
        title={issue.challanNumber}
        description={`Issued ${formatDate(issue.issueDate)}${issue.partner ? ` to ${issue.partner.businessName}` : ''}`}
        actions={
          issue.acknowledgements.length === 0 ? (
            <ActionDialog
              title="Acknowledge receipt"
              description="Recording received weight closes the challan and flags any shortage or damage."
              triggerLabel="Acknowledge"
              action={acknowledgeMaterialAction}
              hidden={{ issueId: issue.id }}
              fields={[
                { name: 'receivedWeightKg', label: 'Received weight (kg)', type: 'number', step: '0.001', required: true },
                { name: 'signatureName', label: 'Received by', required: true },
                { name: 'damageRemarks', label: 'Damage / shortage remarks', type: 'textarea', span: 2 },
              ]}
            />
          ) : null
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Challan</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList
            columns={3}
            items={[
              { label: 'Status', value: <StatusBadge status={issue.status} /> },
              {
                label: 'Job',
                value: issue.job ? (
                  <Link href={`/app/production/jobs/${issue.job.id}`} className="text-primary hover:underline">
                    {issue.job.jobNumber}
                  </Link>
                ) : (
                  '—'
                ),
              },
              {
                label: 'Partner',
                value: issue.partner ? (
                  <Link href={`/app/partners/${issue.partner.id}`} className="text-primary hover:underline">
                    {issue.partner.businessName}
                  </Link>
                ) : (
                  '—'
                ),
              },
              { label: 'Total weight', value: `${formatNumber(issue.totalIssueWeightKg, 3)} kg` },
              { label: 'Expected return', value: formatDate(issue.expectedReturnDate) },
              { label: 'Vehicle', value: issue.vehicleNumber ?? '—' },
              { label: 'Driver', value: issue.driverName ?? '—' },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              {
                key: 'item',
                header: 'Item',
                render: (row: MaterialIssueRow['items'][number]) => `${row.item.code} — ${row.item.name}`,
              },
              {
                key: 'qty',
                header: 'Quantity',
                align: 'right',
                render: (row: MaterialIssueRow['items'][number]) => `${formatNumber(row.quantity, 3)} ${row.uom}`,
              },
              {
                key: 'weight',
                header: 'Weight (kg)',
                align: 'right',
                render: (row: MaterialIssueRow['items'][number]) =>
                  row.issueWeightKg === null ? '—' : formatNumber(row.issueWeightKg, 3),
              },
              {
                key: 'heat',
                header: 'Heat number',
                render: (row: MaterialIssueRow['items'][number]) => row.heatNumber ?? '—',
              },
            ]}
            rows={issue.items}
            empty={{ title: 'No items on this challan' }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Acknowledgements</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              {
                key: 'when',
                header: 'Acknowledged',
                render: (row: MaterialIssueRow['acknowledgements'][number]) => formatDateTime(row.acknowledgedAt),
              },
              {
                key: 'received',
                header: 'Received (kg)',
                align: 'right',
                render: (row: MaterialIssueRow['acknowledgements'][number]) => formatNumber(row.receivedWeightKg, 3),
              },
              {
                key: 'shortage',
                header: 'Shortage (kg)',
                align: 'right',
                render: (row: MaterialIssueRow['acknowledgements'][number]) =>
                  row.shortageWeightKg > 0 ? (
                    <span className="font-medium text-destructive">{formatNumber(row.shortageWeightKg, 3)}</span>
                  ) : (
                    '0'
                  ),
              },
            ]}
            rows={issue.acknowledgements}
            empty={{ title: 'Not acknowledged yet', description: 'The partner acknowledges receipt in GRID-X Partner.' }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
