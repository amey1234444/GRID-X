import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  DELAY_REASONS,
  JOB_PRIORITIES,
  MATERIAL_RESPONSIBILITIES,
  MILESTONE_TYPES,
  RESPONSIBLE_PARTIES,
} from '@gridx/shared';

import {
  allocateJobAction,
  answerClarificationAction,
  cancelJobAction,
  closeJobAction,
  createMaterialIssueAction,
  jobMilestoneAction,
  reportDelayAction,
  requestInspectionAction,
  updateJobAction,
} from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { DataTable } from '@/components/app/data-table';
import { DetailList } from '@/components/app/detail-list';
import { EmptyState } from '@/components/app/empty-state';
import { PageHeader } from '@/components/app/page-header';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { Timeline } from '@/components/app/timeline';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, formatDate, formatDateTime, formatNumber, humanise } from '@/lib/format';
import { optionsFrom } from '@/lib/options';
import { inspectorOptions, itemOptions, partnerOptions } from '@/lib/reference';
import { apiFetch } from '@/lib/session';
import type { PartnerRecommendation } from '@gridx/shared';

import type { JobDetail } from '@/lib/types';

export default async function JobDetailPage({
  params,
}: {
  params: { id: string };
}): Promise<React.JSX.Element> {
  const [result, partners, items, inspectors] = await Promise.all([
    apiFetch<JobDetail>(`/jobs/${params.id}`),
    partnerOptions(),
    itemOptions(),
    inspectorOptions(),
  ]);
  const job = result.data;
  if (!job) notFound();

  const recommendations =
    job.partner === null
      ? (await apiFetch<PartnerRecommendation[]>(`/jobs/${job.id}/recommendations`)).data ?? []
      : [];

  const openMilestones = MILESTONE_TYPES.filter(
    (type) => !job.milestones.some((milestone) => milestone.type === type),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={job.jobNumber}
        description={`${job.component.componentCode} · ${job.component.name} · ${formatNumber(job.quantity)} pcs due ${formatDate(job.dueDate)}`}
        actions={
          <>
            <ActionDialog
              title="Edit job"
              description="Only the fields you fill in are changed."
              triggerLabel="Edit"
              triggerVariant="outline"
              action={updateJobAction}
              hidden={{ jobId: job.id }}
              fields={[
                { name: 'quantity', label: 'Quantity', type: 'number', defaultValue: String(job.quantity) },
                {
                  name: 'rate',
                  label: 'Conversion rate',
                  type: 'number',
                  step: '0.01',
                  defaultValue: String(job.rate),
                },
                { name: 'dueDate', label: 'Due date', type: 'date', defaultValue: job.dueDate.slice(0, 10) },
                {
                  name: 'plannedStartDate',
                  label: 'Planned start',
                  type: 'date',
                  defaultValue: job.plannedStartDate ? job.plannedStartDate.slice(0, 10) : undefined,
                },
                {
                  name: 'priority',
                  label: 'Priority',
                  type: 'select',
                  options: optionsFrom(JOB_PRIORITIES),
                  defaultValue: job.priority,
                },
                {
                  name: 'materialResponsibility',
                  label: 'Material responsibility',
                  type: 'select',
                  options: optionsFrom(MATERIAL_RESPONSIBILITIES),
                  defaultValue: job.materialResponsibility,
                },
                {
                  name: 'deliveryLocation',
                  label: 'Delivery location',
                  defaultValue: job.deliveryLocation ?? undefined,
                  span: 2,
                },
                {
                  name: 'customerProject',
                  label: 'Customer / project',
                  defaultValue: job.customerProject ?? undefined,
                },
                { name: 'sourceRef', label: 'Source reference', defaultValue: job.sourceRef ?? undefined },
                { name: 'notes', label: 'Notes', type: 'textarea', defaultValue: job.notes ?? undefined, span: 2 },
              ]}
            />
            {job.partner === null ? (
              <ActionDialog
                title="Allocate job"
                description="Allocation validates partner approval, component approval, capability, capacity and Class A authorisation."
                triggerLabel="Allocate"
                action={allocateJobAction}
                hidden={{ jobId: job.id }}
                fields={[
                  { name: 'partnerId', label: 'Partner', type: 'select', required: true, options: partners, span: 2 },
                  {
                    name: 'rate',
                    label: 'Conversion rate',
                    type: 'number',
                    step: '0.01',
                    help: 'Leave blank to keep the job rate. Dates are changed with Edit job.',
                  },
                  {
                    name: 'grantDrawingAccess',
                    label: 'Drawing access',
                    type: 'checkbox',
                    defaultValue: 'on',
                    placeholder: 'Grant access to the released revision',
                  },
                  { name: 'classAOverrideReason', label: 'Class A authorisation reason', type: 'textarea', span: 2 },
                ]}
              />
            ) : (
              <ActionDialog
                title="Record milestone"
                triggerLabel="Record milestone"
                action={jobMilestoneAction}
                hidden={{ jobId: job.id }}
                fields={[
                  {
                    name: 'type',
                    label: 'Milestone',
                    type: 'select',
                    required: true,
                    options: optionsFrom(openMilestones.length > 0 ? openMilestones : MILESTONE_TYPES),
                    span: 2,
                  },
                  { name: 'quantityCompleted', label: 'Quantity completed', type: 'number' },
                  { name: 'expectedCompletionDate', label: 'Expected completion', type: 'date' },
                  { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
                ]}
              />
            )}
            <ActionDialog
              title="Request inspection"
              triggerLabel="Request inspection"
              triggerVariant="outline"
              action={requestInspectionAction}
              hidden={{ jobId: job.id }}
              fields={[
                {
                  name: 'type',
                  label: 'Inspection type',
                  type: 'select',
                  options: optionsFrom(['FIRST_ARTICLE', 'IN_PROCESS', 'FINAL', 'PRE_DISPATCH', 'INCOMING']),
                  defaultValue: 'FINAL',
                },
                { name: 'offeredQuantity', label: 'Offered quantity', type: 'number', required: true },
                { name: 'inspectorId', label: 'Inspector', type: 'select', options: inspectors },
                { name: 'dueAt', label: 'Due at', type: 'date' },
                {
                  name: 'photographFileIds',
                  label: 'Photographs',
                  type: 'files',
                  category: 'PHOTOGRAPH',
                  accept: 'image/*',
                  span: 2,
                },
                { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
              ]}
            />
            <ActionDialog
              title="Report delay"
              triggerLabel="Report delay"
              triggerVariant="outline"
              action={reportDelayAction}
              hidden={{ jobId: job.id }}
              fields={[
                { name: 'reason', label: 'Reason', type: 'select', required: true, options: optionsFrom(DELAY_REASONS) },
                {
                  name: 'responsibility',
                  label: 'Responsibility',
                  type: 'select',
                  options: optionsFrom(RESPONSIBLE_PARTIES),
                  defaultValue: 'PARTNER',
                },
                { name: 'delayDays', label: 'Delay (days)', type: 'number', defaultValue: '1' },
                { name: 'expectedCompletionDate', label: 'New expected completion', type: 'date' },
                { name: 'detail', label: 'Detail', type: 'textarea', span: 2 },
              ]}
            />
            <ActionDialog
              title="Close job"
              description="Closure requires quality acceptance and material reconciliation."
              triggerLabel="Close"
              triggerVariant="secondary"
              action={closeJobAction}
              hidden={{ jobId: job.id }}
              fields={[{ name: 'remarks', label: 'Closure remarks', type: 'textarea', span: 2 }]}
            />
            <ActionDialog
              title="Cancel job"
              triggerLabel="Cancel"
              triggerVariant="destructive"
              action={cancelJobAction}
              hidden={{ jobId: job.id }}
              fields={[{ name: 'reason', label: 'Reason', type: 'textarea', required: true, span: 2 }]}
            />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Status" value={humanise(job.status)} />
        <StatCard
          label="Accepted"
          value={`${formatNumber(job.acceptedQuantity)} / ${formatNumber(job.quantity)}`}
          tone="success"
        />
        <StatCard
          label="Rejected / rework"
          value={`${formatNumber(job.rejectedQuantity)} / ${formatNumber(job.reworkQuantity)}`}
          tone={job.rejectedQuantity > 0 ? 'destructive' : 'default'}
        />
        <StatCard label="Job value" value={formatCurrency(job.quantity * job.rate)} hint={`rate ${formatNumber(job.rate, 2)}`} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="material">Material</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
          <TabsTrigger value="commercial">Commercial</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Job details</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailList
                columns={3}
                items={[
                  {
                    label: 'Partner',
                    value: job.partner ? (
                      <Link href={`/app/partners/${job.partner.id}`} className="text-primary hover:underline">
                        {job.partner.businessName}
                      </Link>
                    ) : (
                      'Unallocated'
                    ),
                  },
                  { label: 'Priority', value: <Badge variant="outline">{job.priority}</Badge> },
                  { label: 'Source', value: `${humanise(job.source)}${job.sourceRef ? ` · ${job.sourceRef}` : ''}` },
                  { label: 'Customer / project', value: job.customerProject ?? '—' },
                  { label: 'Material responsibility', value: humanise(job.materialResponsibility) },
                  { label: 'Delivery location', value: job.deliveryLocation ?? '—' },
                  { label: 'Planned start', value: formatDate(job.plannedStartDate) },
                  { label: 'Production started', value: formatDateTime(job.productionStartedAt) },
                  { label: 'Completed', value: formatDateTime(job.completedAt) },
                  { label: 'Criticality', value: humanise(job.component.criticality) },
                  { label: 'Inspection level', value: humanise(job.component.inspectionLevel) },
                  {
                    label: 'Drawing revision',
                    value: job.drawingRevision ? (
                      <Link
                        href={`/app/engineering/drawings/${job.drawingRevision.drawing.id}`}
                        className="text-primary hover:underline"
                      >
                        {job.drawingRevision.drawing.drawingNumber} · rev {job.drawingRevision.revisionCode}
                      </Link>
                    ) : (
                      '—'
                    ),
                  },
                  { label: 'Class A authorisation', value: job.classAOverrideReason ?? '—' },
                  { label: 'Notes', value: job.notes ?? '—' },
                ]}
              />
            </CardContent>
          </Card>

          {recommendations.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Recommended partners</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'partner', header: 'Partner', render: (row: PartnerRecommendation) => row.businessName },
                    { key: 'score', header: 'Fit score', align: 'right', render: (row: PartnerRecommendation) => formatNumber(row.score, 1) },
                    {
                      key: 'rating',
                      header: 'Rating',
                      align: 'right',
                      render: (row: PartnerRecommendation) => formatNumber(row.rating, 1),
                    },
                    {
                      key: 'capacity',
                      header: 'Free capacity (h)',
                      align: 'right',
                      render: (row: PartnerRecommendation) => formatNumber(row.freeCapacityHours),
                    },
                    {
                      key: 'rate',
                      header: 'Rate',
                      align: 'right',
                      render: (row: PartnerRecommendation) =>
                        row.conversionRate === null ? '—' : formatNumber(row.conversionRate, 2),
                    },
                    {
                      key: 'blockers',
                      header: 'Blockers',
                      render: (row: PartnerRecommendation) => row.blockers.join(', ') || 'None',
                    },
                  ]}
                  rows={recommendations}
                  empty={{ title: 'No recommendation available' }}
                />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Allocation history</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  {
                    key: 'partner',
                    header: 'Partner',
                    render: (row: JobDetail['assignments'][number]) => row.partner?.businessName ?? '—',
                  },
                  {
                    key: 'assigned',
                    header: 'Assigned',
                    render: (row: JobDetail['assignments'][number]) => formatDateTime(row.assignedAt),
                  },
                  {
                    key: 'response',
                    header: 'Response',
                    render: (row: JobDetail['assignments'][number]) =>
                      row.accepted === null ? (
                        <StatusBadge status="PENDING" />
                      ) : (
                        <StatusBadge status={row.accepted ? 'ACCEPTED' : 'DECLINED'} />
                      ),
                  },
                  {
                    key: 'reason',
                    header: 'Decline reason',
                    render: (row: JobDetail['assignments'][number]) => row.declineReason ?? '—',
                  },
                ]}
                rows={job.assignments}
                empty={{ title: 'Not allocated yet' }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Milestones</CardTitle>
            </CardHeader>
            <CardContent>
              {job.milestones.length === 0 ? (
                <EmptyState title="No milestones reported" description="Milestones arrive from the partner app or can be recorded here." />
              ) : (
                <Timeline
                  items={job.milestones.map((milestone) => ({
                    id: milestone.id,
                    title: humanise(milestone.type),
                    timestamp: formatDateTime(milestone.reportedAt),
                    description: [
                      milestone.quantityCompleted === null ? null : `${formatNumber(milestone.quantityCompleted)} pcs`,
                      milestone.remarks,
                      milestone.syncedFromOffline ? 'synced from offline' : null,
                    ]
                      .filter(Boolean)
                      .join(' · '),
                  }))}
                />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Status history</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: 'when', header: 'When', render: (row: JobDetail['statusHistory'][number]) => formatDateTime(row.createdAt) },
                  {
                    key: 'change',
                    header: 'Change',
                    render: (row: JobDetail['statusHistory'][number]) =>
                      `${humanise(row.fromStatus)} → ${humanise(row.toStatus)}`,
                  },
                  { key: 'reason', header: 'Reason', render: (row: JobDetail['statusHistory'][number]) => row.reason ?? '—' },
                ]}
                rows={job.statusHistory}
                empty={{ title: 'No status changes' }}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Delays</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: 'when', header: 'Reported', render: (row: JobDetail['delays'][number]) => formatDateTime(row.reportedAt) },
                  { key: 'reason', header: 'Reason', render: (row: JobDetail['delays'][number]) => humanise(row.reason) },
                  {
                    key: 'responsibility',
                    header: 'Responsibility',
                    render: (row: JobDetail['delays'][number]) => humanise(row.responsibility),
                  },
                  { key: 'days', header: 'Days', align: 'right', render: (row: JobDetail['delays'][number]) => formatNumber(row.delayDays) },
                  { key: 'detail', header: 'Detail', render: (row: JobDetail['delays'][number]) => row.detail ?? '—' },
                ]}
                rows={job.delays}
                empty={{ title: 'No delays reported' }}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Clarifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {job.clarifications.length === 0 ? (
                <EmptyState title="No clarifications" description="Partner questions about drawings or process appear here." />
              ) : (
                job.clarifications.map((clarification) => (
                  <div key={clarification.id} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{clarification.question}</p>
                      <StatusBadge status={clarification.status} />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {clarification.answer ?? 'Awaiting an answer from engineering.'}
                    </p>
                    {clarification.answer === null ? (
                      <div className="mt-3">
                        <ActionDialog
                          title="Answer clarification"
                          triggerLabel="Answer"
                          triggerSize="sm"
                          triggerVariant="outline"
                          action={answerClarificationAction}
                          hidden={{ clarificationId: clarification.id, jobId: job.id }}
                          fields={[{ name: 'answer', label: 'Answer', type: 'textarea', required: true, span: 2 }]}
                        />
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="material" className="space-y-4">
          <div className="flex justify-end">
            <ActionDialog
              title="Issue material"
              description="Creates a delivery challan for the partner. Weights drive the reconciliation."
              triggerLabel="Issue material"
              triggerSize="sm"
              action={createMaterialIssueAction}
              hidden={{ jobId: job.id }}
              fields={[
                {
                  name: 'items',
                  label: 'Material lines',
                  type: 'rows',
                  addLabel: 'Add material line',
                  span: 2,
                  columns: [
                    { name: 'itemId', label: 'Item', type: 'select', options: items, required: true },
                    { name: 'quantity', label: 'Quantity', type: 'number', required: true },
                    { name: 'uom', label: 'UOM', defaultValue: 'KG' },
                    { name: 'issueWeightKg', label: 'Issue weight (kg)', type: 'number', step: '0.001', required: true },
                    { name: 'batchNumber', label: 'Batch number' },
                    { name: 'heatNumber', label: 'Heat number' },
                  ],
                },
                { name: 'expectedReturnDate', label: 'Expected return', type: 'date' },
                { name: 'vehicleNumber', label: 'Vehicle number' },
                { name: 'driverName', label: 'Driver name' },
                {
                  name: 'photographFileIds',
                  label: 'Loading photographs',
                  type: 'files',
                  category: 'PHOTOGRAPH',
                  accept: 'image/*',
                },
                { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
              ]}
            />
          </div>
          <DataTable
            columns={[
              {
                key: 'challan',
                header: 'Challan',
                render: (row: JobDetail['materialIssues'][number]) => row.challanNumber,
              },
              { key: 'date', header: 'Issued', render: (row: JobDetail['materialIssues'][number]) => formatDate(row.issueDate) },
              { key: 'status', header: 'Status', render: (row: JobDetail['materialIssues'][number]) => <StatusBadge status={row.status} /> },
              {
                key: 'weight',
                header: 'Weight (kg)',
                align: 'right',
                render: (row: JobDetail['materialIssues'][number]) => formatNumber(row.totalIssueWeightKg, 3),
              },
              {
                key: 'items',
                header: 'Items',
                render: (row: JobDetail['materialIssues'][number]) =>
                  row.items.map((line) => `${line.item.code} ${formatNumber(line.quantity)} ${line.uom}`).join(', '),
              },
            ]}
            rows={job.materialIssues}
            rowHref={(row) => `/app/materials/issues/${row.id}`}
            empty={{ title: 'No material issued', description: 'Issue material once the partner accepts the job.' }}
          />
          <Card>
            <CardHeader>
              <CardTitle>Reconciliation</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  {
                    key: 'item',
                    header: 'Item',
                    render: (row: JobDetail['reconciliations'][number]) => `${row.item.code} — ${row.item.name}`,
                  },
                  { key: 'issued', header: 'Issued', align: 'right', render: (row: JobDetail['reconciliations'][number]) => formatNumber(row.issuedKg, 3) },
                  { key: 'consumed', header: 'Consumed', align: 'right', render: (row: JobDetail['reconciliations'][number]) => formatNumber(row.consumedKg, 3) },
                  { key: 'scrap', header: 'Scrap', align: 'right', render: (row: JobDetail['reconciliations'][number]) => formatNumber(row.scrapReturnedKg, 3) },
                  { key: 'unused', header: 'Unused', align: 'right', render: (row: JobDetail['reconciliations'][number]) => formatNumber(row.unusedReturnedKg, 3) },
                  {
                    key: 'shortage',
                    header: 'Shortage',
                    align: 'right',
                    render: (row: JobDetail['reconciliations'][number]) => formatNumber(row.shortageKg, 3),
                  },
                  {
                    key: 'deduction',
                    header: 'Deduction',
                    align: 'right',
                    render: (row: JobDetail['reconciliations'][number]) => formatCurrency(row.deductionAmount),
                  },
                  { key: 'status', header: 'Status', render: (row: JobDetail['reconciliations'][number]) => <StatusBadge status={row.status} /> },
                ]}
                rows={job.reconciliations}
                empty={{ title: 'Not reconciled', description: 'Reconcile material before payment approval.' }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <DataTable
            columns={[
              {
                key: 'inspection',
                header: 'Inspection',
                render: (row: JobDetail['inspections'][number]) => row.inspectionNumber,
              },
              { key: 'type', header: 'Type', render: (row: JobDetail['inspections'][number]) => humanise(row.type) },
              { key: 'status', header: 'Status', render: (row: JobDetail['inspections'][number]) => <StatusBadge status={row.status} /> },
              {
                key: 'decision',
                header: 'Decision',
                render: (row: JobDetail['inspections'][number]) =>
                  row.decision ? <StatusBadge status={row.decision} /> : '—',
              },
              {
                key: 'quantities',
                header: 'Offered / accepted / rejected',
                align: 'right',
                render: (row: JobDetail['inspections'][number]) =>
                  `${formatNumber(row.offeredQuantity)} / ${formatNumber(row.acceptedQuantity)} / ${formatNumber(row.rejectedQuantity)}`,
              },
            ]}
            rows={job.inspections}
            rowHref={(row) => `/app/quality/inspections/${row.id}`}
            empty={{ title: 'No inspections yet' }}
          />
          <DataTable
            columns={[
              { key: 'rework', header: 'Rework order', render: (row: JobDetail['reworkOrders'][number]) => row.reworkNumber },
              { key: 'status', header: 'Status', render: (row: JobDetail['reworkOrders'][number]) => <StatusBadge status={row.status} /> },
              { key: 'qty', header: 'Quantity', align: 'right', render: (row: JobDetail['reworkOrders'][number]) => formatNumber(row.quantity) },
            ]}
            rows={job.reworkOrders}
            empty={{ title: 'No rework orders' }}
          />
        </TabsContent>

        <TabsContent value="commercial" className="space-y-4">
          <DataTable
            columns={[
              {
                key: 'invoice',
                header: 'Invoice',
                render: (row: JobDetail['invoiceItems'][number]) => row.invoice.invoiceNumber,
              },
              { key: 'status', header: 'Status', render: (row: JobDetail['invoiceItems'][number]) => <StatusBadge status={row.invoice.status} /> },
              { key: 'amount', header: 'Amount', align: 'right', render: (row: JobDetail['invoiceItems'][number]) => formatCurrency(row.amount) },
            ]}
            rows={job.invoiceItems}
            rowHref={(row) => `/app/commercial/invoices/${row.invoice.id}`}
            empty={{ title: 'Not invoiced yet', description: 'Partners invoice on accepted quantity only.' }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
