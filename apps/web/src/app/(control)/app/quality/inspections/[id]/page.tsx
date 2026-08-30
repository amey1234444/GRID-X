import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DEFECT_TYPES, INSPECTION_DECISIONS, RESPONSIBLE_PARTIES, RESULT_VERDICTS } from '@gridx/shared';

import {
  assignInspectionAction,
  completeInspectionAction,
  decideDeviationAction,
  saveInspectionResultsAction,
  startInspectionAction,
} from '@/app/actions/control';
import { ActivityTrail } from '@/components/app/activity-trail';
import { ActionDialog } from '@/components/app/action-dialog';
import { DataTable } from '@/components/app/data-table';
import { DetailList } from '@/components/app/detail-list';
import { EmptyState } from '@/components/app/empty-state';
import { PageHeader } from '@/components/app/page-header';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime, formatNumber, humanise } from '@/lib/format';
import { optionsFrom } from '@/lib/options';
import { inspectorOptions } from '@/lib/reference';
import { apiFetch } from '@/lib/session';
import type { InspectionDetail } from '@/lib/types';

export default async function InspectionDetailPage({
  params,
}: {
  params: { id: string };
}): Promise<React.JSX.Element> {
  const [result, inspectors] = await Promise.all([
    apiFetch<InspectionDetail>(`/quality/inspections/${params.id}`),
    inspectorOptions(),
  ]);
  const inspection = result.data;
  if (!inspection) notFound();

  const characteristics = inspection.inspectionPlan?.characteristics ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        icon="ShieldCheck"
        title={inspection.inspectionNumber}
        description={`${humanise(inspection.type)} inspection${inspection.job ? ` · job ${inspection.job.jobNumber}` : ''}`}
        actions={
          <>
            {inspection.status === 'REQUESTED' ? (
              <ActionDialog
                title="Assign inspector"
                triggerLabel="Assign"
                action={assignInspectionAction}
                hidden={{ inspectionId: inspection.id }}
                fields={[
                  { name: 'inspectorId', label: 'Inspector', type: 'select', required: true, options: inspectors, span: 2 },
                  { name: 'dueAt', label: 'Due at', type: 'date' },
                ]}
              />
            ) : null}
            {inspection.status === 'ASSIGNED' ? (
              <ActionDialog
                title="Start inspection"
                triggerLabel="Start"
                action={startInspectionAction}
                hidden={{ inspectionId: inspection.id }}
                fields={[]}
              />
            ) : null}
            {inspection.status === 'IN_PROGRESS' ? (
              <>
                <ActionDialog
                  title="Record measurement"
                  description="Record the measured value against a plan characteristic."
                  triggerLabel="Record result"
                  action={saveInspectionResultsAction}
                  hidden={{ inspectionId: inspection.id }}
                  fields={[
                    {
                      name: 'characteristicId',
                      label: 'Characteristic',
                      type: 'select',
                      options: characteristics.map((item) => ({
                        value: item.id,
                        label: `${item.characteristic} (${item.specification})`,
                      })),
                      span: 2,
                    },
                    { name: 'characteristicName', label: 'Characteristic name', required: true, span: 2 },
                    { name: 'specification', label: 'Specification' },
                    { name: 'actualValue', label: 'Measured value', required: true },
                    { name: 'numericValue', label: 'Numeric value', type: 'number', step: '0.001' },
                    { name: 'measuringInstrument', label: 'Instrument' },
                    {
                      name: 'verdict',
                      label: 'Verdict',
                      type: 'select',
                      options: optionsFrom(RESULT_VERDICTS),
                      defaultValue: 'PASS',
                    },
                    { name: 'sampleNumber', label: 'Sample number', type: 'number', defaultValue: '1' },
                    { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
                  ]}
                />
                <ActionDialog
                  title="Complete inspection"
                  description="Accepted quantity drives payment; rejected quantity raises a non-conformance and optional rework."
                  triggerLabel="Complete"
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
                    { name: 'acceptedQuantity', label: 'Accepted quantity', type: 'number', required: true },
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
                    { name: 'probableCause', label: 'Probable cause', type: 'textarea', span: 2 },
                    {
                      name: 'photographFileIds',
                      label: 'Evidence photographs',
                      type: 'files',
                      category: 'PHOTOGRAPH',
                      accept: 'image/*',
                      span: 2,
                    },
                    { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
                  ]}
                />
              </>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Status" value={humanise(inspection.status)} />
        <StatCard label="Offered" value={formatNumber(inspection.offeredQuantity)} />
        <StatCard label="Accepted" value={formatNumber(inspection.acceptedQuantity)} tone="success" />
        <StatCard
          label="Rejected / rework"
          value={`${formatNumber(inspection.rejectedQuantity)} / ${formatNumber(inspection.reworkQuantity)}`}
          tone={inspection.rejectedQuantity > 0 ? 'destructive' : 'default'}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inspection</CardTitle>
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
              {
                label: 'Partner',
                value: inspection.partner ? (
                  <Link href={`/app/partners/${inspection.partner.id}`} className="text-primary hover:underline">
                    {inspection.partner.businessName}
                  </Link>
                ) : (
                  '—'
                ),
              },
              { label: 'Inspector', value: inspection.inspector?.name ?? 'Unassigned' },
              { label: 'Plan', value: inspection.inspectionPlan?.name ?? 'No plan linked' },
              { label: 'Requested', value: formatDateTime(inspection.requestedAt) },
              { label: 'Completed', value: formatDateTime(inspection.completedAt) },
              { label: 'Decision', value: inspection.decision ? humanise(inspection.decision) : '—' },
              { label: 'Remarks', value: inspection.remarks ?? '—' },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan characteristics</CardTitle>
        </CardHeader>
        <CardContent>
          {characteristics.length === 0 ? (
            <EmptyState title="No inspection plan" description="Link an inspection plan to the component for guided inspection." />
          ) : (
            <DataTable
              columns={[
                {
                  key: 'seq',
                  header: '#',
                  render: (row: NonNullable<InspectionDetail['inspectionPlan']>['characteristics'][number]) =>
                    String(row.sequence),
                },
                {
                  key: 'characteristic',
                  header: 'Characteristic',
                  render: (row: NonNullable<InspectionDetail['inspectionPlan']>['characteristics'][number]) => (
                    <span className="font-medium">
                      {row.characteristic}
                      {row.isCritical ? <span className="ml-2 text-xs text-destructive">critical</span> : null}
                    </span>
                  ),
                },
                {
                  key: 'spec',
                  header: 'Specification',
                  render: (row: NonNullable<InspectionDetail['inspectionPlan']>['characteristics'][number]) =>
                    `${row.specification}${row.unit ? ` ${row.unit}` : ''}`,
                },
                {
                  key: 'instrument',
                  header: 'Instrument',
                  render: (row: NonNullable<InspectionDetail['inspectionPlan']>['characteristics'][number]) =>
                    row.measuringInstrument ?? '—',
                },
              ]}
              rows={characteristics}
              empty={{ title: 'No characteristics' }}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Measured results</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              {
                key: 'characteristic',
                header: 'Characteristic',
                render: (row: InspectionDetail['results'][number]) => row.characteristicName,
              },
              {
                key: 'spec',
                header: 'Specification',
                render: (row: InspectionDetail['results'][number]) => row.specification ?? '—',
              },
              {
                key: 'actual',
                header: 'Measured',
                render: (row: InspectionDetail['results'][number]) => row.actualValue ?? '—',
              },
              {
                key: 'verdict',
                header: 'Verdict',
                render: (row: InspectionDetail['results'][number]) => <StatusBadge status={row.verdict} />,
              },
              {
                key: 'sample',
                header: 'Sample',
                align: 'right',
                render: (row: InspectionDetail['results'][number]) => String(row.sampleNumber),
              },
              {
                key: 'when',
                header: 'Recorded',
                render: (row: InspectionDetail['results'][number]) => formatDateTime(row.recordedAt),
              },
            ]}
            rows={inspection.results}
            empty={{ title: 'No results recorded yet' }}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Non-conformances</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { key: 'nc', header: 'NC', render: (row: InspectionDetail['nonConformances'][number]) => row.ncNumber },
                {
                  key: 'defect',
                  header: 'Defect',
                  render: (row: InspectionDetail['nonConformances'][number]) => humanise(row.defectType),
                },
                {
                  key: 'qty',
                  header: 'Quantity',
                  align: 'right',
                  render: (row: InspectionDetail['nonConformances'][number]) => formatNumber(row.quantityAffected),
                },
              ]}
              rows={inspection.nonConformances}
              empty={{ title: 'No non-conformances' }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Deviation requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {inspection.deviations.length === 0 ? (
              <EmptyState title="No deviation requests" description="Use-as-is decisions are recorded here." />
            ) : (
              inspection.deviations.map((deviation) => (
                <div key={deviation.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm">{deviation.requestNote ?? 'Deviation requested'}</p>
                    <StatusBadge status={deviation.status} />
                  </div>
                  {deviation.decisionNote ? (
                    <p className="mt-2 text-sm text-muted-foreground">{deviation.decisionNote}</p>
                  ) : (
                    <div className="mt-3">
                      <ActionDialog
                        title="Decide deviation"
                        triggerLabel="Decide"
                        triggerSize="sm"
                        triggerVariant="outline"
                        action={decideDeviationAction}
                        hidden={{ deviationId: deviation.id, inspectionId: inspection.id }}
                        fields={[
                          {
                            name: 'status',
                            label: 'Decision',
                            type: 'select',
                            required: true,
                            options: optionsFrom(['APPROVED', 'REJECTED']),
                            span: 2,
                          },
                          { name: 'decisionNote', label: 'Decision note', type: 'textarea', span: 2 },
                        ]}
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <ActivityTrail entityType="Inspection" entityId={inspection.id} />
    </div>
  );
}
