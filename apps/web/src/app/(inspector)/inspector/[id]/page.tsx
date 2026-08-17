import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DEFECT_TYPES, INSPECTION_DECISIONS, RESPONSIBLE_PARTIES } from '@gridx/shared';

import {
  completeInspectionAction,
  createCorrectiveActionAction,
  startInspectionAction,
} from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { DataTable, type Column } from '@/components/app/data-table';
import { DetailList } from '@/components/app/detail-list';
import { EmptyState } from '@/components/app/empty-state';
import { PageHeader } from '@/components/app/page-header';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { InspectionResultsForm } from '@/components/inspector/inspection-results-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDateTime, formatNumber, humanise } from '@/lib/format';
import { optionsFrom } from '@/lib/options';
import { apiFetch } from '@/lib/session';
import type { InspectionDetail } from '@/lib/types';

export const metadata = { title: 'Inspection · GRID-X Inspector' };

type ResultRow = InspectionDetail['results'][number];

export default async function InspectorInspectionPage({
  params,
}: {
  params: { id: string };
}): Promise<React.JSX.Element> {
  const result = await apiFetch<InspectionDetail>(`/quality/inspections/${params.id}`);
  const inspection = result.data;
  if (!inspection) notFound();

  const characteristics = inspection.inspectionPlan?.characteristics ?? [];
  const failures = inspection.results.filter((row) => row.verdict !== 'PASS');

  const resultColumns: Column<ResultRow>[] = [
    { key: 'characteristic', header: 'Characteristic', render: (row) => row.characteristicName },
    { key: 'spec', header: 'Specification', render: (row) => row.specification ?? '—' },
    { key: 'actual', header: 'Measured', render: (row) => row.actualValue ?? '—' },
    { key: 'sample', header: 'Sample', align: 'right', render: (row) => String(row.sampleNumber) },
    { key: 'verdict', header: 'Verdict', render: (row) => <StatusBadge status={row.verdict} /> },
    { key: 'recorded', header: 'Recorded', render: (row) => formatDateTime(row.recordedAt) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={inspection.inspectionNumber}
        description={`${humanise(inspection.type)} inspection${inspection.job ? ` · job ${inspection.job.jobNumber}` : ''}${inspection.partner ? ` · ${inspection.partner.businessName}` : ''}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={inspection.decision ?? inspection.status} />
            {inspection.status === 'REQUESTED' || inspection.status === 'ASSIGNED' ? (
              <ActionDialog
                title="Start inspection"
                description="Starting the inspection records you as the inspector and timestamps the check."
                triggerLabel="Start inspection"
                submitLabel="Start"
                action={startInspectionAction}
                hidden={{ inspectionId: inspection.id }}
                fields={[]}
              />
            ) : null}
            {inspection.status === 'IN_PROGRESS' ? (
              <ActionDialog
                title="Complete inspection"
                description="Accepted quantity drives partner payment. Rejected quantity raises a non-conformance and optional rework order."
                triggerLabel="Complete inspection"
                submitLabel="Complete"
                action={completeInspectionAction}
                hidden={{ inspectionId: inspection.id, jobId: inspection.job?.id }}
                fields={[
                  {
                    name: 'decision',
                    label: 'Decision',
                    type: 'select',
                    required: true,
                    options: optionsFrom(INSPECTION_DECISIONS),
                    span: 2,
                  },
                  {
                    name: 'acceptedQuantity',
                    label: 'Accepted quantity',
                    type: 'number',
                    required: true,
                    defaultValue: String(inspection.offeredQuantity),
                  },
                  { name: 'rejectedQuantity', label: 'Rejected quantity', type: 'number', defaultValue: '0' },
                  { name: 'reworkQuantity', label: 'Rework quantity', type: 'number', defaultValue: '0' },
                  { name: 'defectType', label: 'Defect type', type: 'select', options: optionsFrom(DEFECT_TYPES) },
                  {
                    name: 'responsibility',
                    label: 'Responsibility',
                    type: 'select',
                    options: optionsFrom(RESPONSIBLE_PARTIES),
                    defaultValue: 'PARTNER',
                  },
                  { name: 'reworkCost', label: 'Rework cost', type: 'number', step: '0.01' },
                  { name: 'materialLoss', label: 'Material loss', type: 'number', step: '0.01' },
                  { name: 'reworkInstructions', label: 'Rework instructions', type: 'textarea', span: 2 },
                  { name: 'reworkDueDate', label: 'Rework due date', type: 'date' },
                  { name: 'probableCause', label: 'Probable cause', type: 'textarea', span: 2 },
                  { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
                ]}
              />
            ) : null}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Offered" value={formatNumber(inspection.offeredQuantity)} />
        <StatCard label="Inspected" value={formatNumber(inspection.inspectedQuantity)} />
        <StatCard label="Accepted" value={formatNumber(inspection.acceptedQuantity)} tone="success" />
        <StatCard
          label="Rejected / rework"
          value={`${formatNumber(inspection.rejectedQuantity)} / ${formatNumber(inspection.reworkQuantity)}`}
          tone={inspection.rejectedQuantity > 0 ? 'destructive' : 'default'}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Context</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList
            columns={3}
            items={[
              {
                label: 'Job',
                value: inspection.job ? (
                  <Link href={`/app/production/jobs/${inspection.job.id}`} className="text-primary hover:underline">
                    {inspection.job.jobNumber}
                  </Link>
                ) : (
                  '—'
                ),
              },
              { label: 'Component', value: inspection.job?.component?.name ?? '—' },
              { label: 'Partner', value: inspection.partner?.businessName ?? '—' },
              { label: 'Plan', value: inspection.inspectionPlan?.name ?? 'No plan linked' },
              { label: 'Inspector', value: inspection.inspector?.name ?? 'Unassigned' },
              { label: 'Requested', value: formatDateTime(inspection.requestedAt) },
              { label: 'Completed', value: formatDateTime(inspection.completedAt) },
              { label: 'Decision', value: inspection.decision ? humanise(inspection.decision) : '—' },
              { label: 'Remarks', value: inspection.remarks ?? '—' },
            ]}
          />
        </CardContent>
      </Card>

      {inspection.status === 'IN_PROGRESS' ? (
        <Card>
          <CardHeader>
            <CardTitle>Record measurements</CardTitle>
            <CardDescription>
              Every characteristic on the inspection plan must be measured before the batch can be closed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {characteristics.length === 0 ? (
              <EmptyState
                title="No inspection plan linked"
                description="Link an inspection plan to the component so measurements are guided and auditable."
              />
            ) : (
              <InspectionResultsForm
                inspectionId={inspection.id}
                characteristics={characteristics}
                offeredQuantity={inspection.offeredQuantity}
              />
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Measured results</CardTitle>
          <CardDescription>
            {failures.length > 0
              ? `${failures.length} characteristic(s) outside specification.`
              : 'All recorded measurements are within specification.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={resultColumns}
            rows={inspection.results}
            empty={{ title: 'No measurements recorded yet' }}
          />
        </CardContent>
      </Card>

      {inspection.nonConformances.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Non-conformances</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {inspection.nonConformances.map((nc) => (
              <div key={nc.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{nc.ncNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {humanise(nc.defectType)} · {formatNumber(nc.quantityAffected)} affected
                  </p>
                </div>
                <ActionDialog
                  title="Raise corrective action"
                  description="8D-style corrective action tracked to closure with an owner and target date."
                  triggerLabel="Corrective action"
                  triggerVariant="outline"
                  submitLabel="Raise"
                  action={createCorrectiveActionAction}
                  hidden={{ nonConformanceId: nc.id }}
                  fields={[
                    {
                      name: 'containment',
                      label: 'Containment action',
                      type: 'textarea',
                      required: true,
                      help: 'Immediate action that stops the defect spreading.',
                      span: 2,
                    },
                    { name: 'dueDate', label: 'Due date', type: 'date' },
                  ]}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {inspection.reworkOrders.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Rework raised</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {inspection.reworkOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <span className="font-medium">{order.reworkNumber}</span>
                <span className="text-xs text-muted-foreground">{formatNumber(order.quantity)} nos</span>
                <StatusBadge status={order.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {inspection.deviations.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Deviation requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {inspection.deviations.map((deviation) => (
              <div key={deviation.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm">{deviation.requestNote ?? 'Deviation requested'}</p>
                  <StatusBadge status={deviation.status} />
                </div>
                {deviation.decisionNote ? (
                  <p className="mt-1 text-xs text-muted-foreground">{deviation.decisionNote}</p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {inspection.nonConformances.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Rework and material loss recorded here feed the partner scorecard and invoice deductions —
          totals: {formatCurrency(inspection.nonConformances.reduce((sum, nc) => sum + nc.quantityAffected, 0))}
        </p>
      ) : null}
    </div>
  );
}
