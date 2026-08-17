import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MILESTONE_LABELS } from '@gridx/shared';

import {
  acknowledgeMaterialAction,
  acknowledgeRevisionAction,
  raiseClarificationAction,
  reportDelayAction,
  requestInspectionAction,
  respondToJobAction,
} from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { DetailList } from '@/components/app/detail-list';
import { EmptyState } from '@/components/app/empty-state';
import { PageHeader } from '@/components/app/page-header';
import { StatusBadge } from '@/components/app/status-badge';
import { Timeline, type TimelineItem } from '@/components/app/timeline';
import { MilestoneForm } from '@/components/partner/milestone-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate, formatDateTime, formatNumber, humanise } from '@/lib/format';
import { optionsFrom } from '@/lib/options';
import type { Language } from '@/lib/i18n';
import { apiFetch, currentUser } from '@/lib/session';
import type { JobDetail } from '@/lib/types';

export const metadata = { title: 'Job · GRID-X Partner' };

const DELAY_REASON_OPTIONS = optionsFrom([
  'MATERIAL_SHORTAGE',
  'DRAWING_CLARIFICATION',
  'MACHINE_BREAKDOWN',
  'LABOUR_SHORTAGE',
  'POWER_ISSUE',
  'QUALITY_ISSUE',
  'TRANSPORT_DELAY',
]);

export default async function PartnerJobDetailPage({
  params,
}: {
  params: { id: string };
}): Promise<React.JSX.Element> {
  const [user, result] = await Promise.all([currentUser(), apiFetch<JobDetail>(`/jobs/${params.id}`)]);
  const job = result.data;
  if (!job) notFound();
  const language: Language = user?.language === 'HI' ? 'HI' : 'EN';
  const hindi = language === 'HI';

  const awaitingResponse = job.status === 'ALLOCATED' && job.acceptedAt === null;
  const revision = job.drawingRevision;
  const revisionAcknowledged = job.milestones.some((milestone) => milestone.type === 'JOB_ACCEPTED');

  const timeline: TimelineItem[] = [
    ...job.milestones.map((milestone) => ({
      id: milestone.id,
      title: MILESTONE_LABELS[milestone.type as keyof typeof MILESTONE_LABELS] ?? humanise(milestone.type),
      timestamp: formatDateTime(milestone.reportedAt),
      description: [
        milestone.quantityCompleted === null ? null : `${formatNumber(milestone.quantityCompleted)} completed`,
        milestone.remarks,
        milestone.syncedFromOffline ? 'Synced from offline' : null,
      ]
        .filter((value): value is string => Boolean(value))
        .join(' · '),
    })),
    ...job.statusHistory.map((entry) => ({
      id: entry.id,
      title: `${humanise(entry.fromStatus ?? 'CREATED')} → ${humanise(entry.toStatus)}`,
      timestamp: formatDateTime(entry.createdAt),
      description: entry.reason ?? undefined,
    })),
  ].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

  const pendingIssues = job.materialIssues.filter((issue) => issue.status !== 'ACKNOWLEDGED');

  return (
    <div className="space-y-6">
      <PageHeader
        title={job.component.name}
        description={`${job.jobNumber} · ${job.component.componentCode} · ${humanise(job.priority)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={job.status} />
            {awaitingResponse ? (
              <>
                <ActionDialog
                  title={hindi ? 'काम स्वीकार करें' : 'Accept this job'}
                  description={
                    hindi
                      ? 'स्वीकार करने पर आप मात्रा और तारीख के लिए ज़िम्मेदार होंगे।'
                      : 'Accepting confirms you can deliver the quantity by the due date.'
                  }
                  triggerLabel={hindi ? 'स्वीकार' : 'Accept'}
                  submitLabel={hindi ? 'स्वीकार' : 'Accept job'}
                  action={respondToJobAction}
                  hidden={{ jobId: job.id, accepted: 'true' }}
                  fields={[]}
                />
                <ActionDialog
                  title={hindi ? 'काम अस्वीकार करें' : 'Decline this job'}
                  triggerLabel={hindi ? 'अस्वीकार' : 'Decline'}
                  triggerVariant="outline"
                  submitLabel={hindi ? 'भेजें' : 'Decline job'}
                  action={respondToJobAction}
                  hidden={{ jobId: job.id, accepted: 'false' }}
                  fields={[
                    {
                      name: 'declineReason',
                      label: hindi ? 'कारण' : 'Reason',
                      type: 'textarea',
                      required: true,
                      span: 2,
                    },
                  ]}
                />
              </>
            ) : null}
          </div>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <DetailList
            columns={3}
            items={[
              { label: hindi ? 'मात्रा' : 'Quantity', value: formatNumber(job.quantity) },
              { label: hindi ? 'अंतिम तारीख' : 'Due date', value: formatDate(job.dueDate) },
              { label: hindi ? 'दर' : 'Conversion rate', value: formatCurrency(job.rate) },
              { label: hindi ? 'स्वीकृत' : 'Accepted', value: formatNumber(job.acceptedQuantity) },
              { label: hindi ? 'अस्वीकृत' : 'Rejected', value: formatNumber(job.rejectedQuantity) },
              { label: hindi ? 'रीवर्क' : 'Rework', value: formatNumber(job.reworkQuantity) },
              { label: hindi ? 'माल' : 'Material', value: humanise(job.materialResponsibility) },
              { label: hindi ? 'जाँच स्तर' : 'Inspection level', value: humanise(job.component.inspectionLevel) },
              { label: hindi ? 'डिलीवरी' : 'Delivery location', value: job.deliveryLocation ?? '—' },
            ]}
          />
          {job.notes ? <p className="mt-5 rounded-md bg-secondary p-3 text-sm">{job.notes}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{hindi ? 'ड्रॉइंग' : 'Released drawing'}</CardTitle>
          <CardDescription>
            {hindi
              ? 'सिर्फ़ मंज़ूर रिवीज़न पर काम करें। देखने का रिकॉर्ड रखा जाता है।'
              : 'Work only from the released revision. Every view and download is logged.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {revision ? (
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{revision.drawing.drawingNumber}</p>
                <p className="truncate text-xs text-muted-foreground">{revision.drawing.title}</p>
              </div>
              <Badge variant="secondary">Rev {revision.revisionCode}</Badge>
              <StatusBadge status={revision.status} />
              <Button asChild variant="outline" size="sm">
                <Link href={`/partner/drawings?revisionId=${revision.id}`}>{hindi ? 'खोलें' : 'Open'}</Link>
              </Button>
              <ActionDialog
                title={hindi ? 'ड्रॉइंग की पुष्टि' : 'Acknowledge drawing'}
                description={
                  hindi
                    ? 'पुष्टि करें कि आपने यही रिवीज़न पढ़ा और समझा है।'
                    : 'Confirm you have read and understood this revision before production.'
                }
                triggerLabel={hindi ? 'पुष्टि' : 'Acknowledge'}
                triggerVariant={revisionAcknowledged ? 'ghost' : 'default'}
                submitLabel={hindi ? 'पुष्टि' : 'Acknowledge'}
                action={acknowledgeRevisionAction}
                hidden={{ revisionId: revision.id }}
                fields={[{ name: 'remarks', label: hindi ? 'टिप्पणी' : 'Remarks', type: 'textarea', span: 2 }]}
              />
            </div>
          ) : (
            <EmptyState
              title={hindi ? 'ड्रॉइंग नहीं जुड़ी' : 'No drawing linked'}
              description={
                hindi ? 'OSWAR से ड्रॉइंग की मांग करें।' : 'Raise a clarification so OSWAR links the released revision.'
              }
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{hindi ? 'माल' : 'Material issued to you'}</CardTitle>
          <CardDescription>
            {hindi ? 'माल मिलने पर वज़न के साथ पुष्टि करें।' : 'Acknowledge each challan with the weight actually received.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {job.materialIssues.length === 0 ? (
            <EmptyState title={hindi ? 'कोई चालान नहीं' : 'No challans yet'} />
          ) : (
            job.materialIssues.map((issue) => (
              <div key={issue.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{issue.challanNumber}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDate(issue.issueDate)} · {formatNumber(issue.totalIssueWeightKg, 3)} kg ·{' '}
                    {issue.items.map((item) => item.item.code).join(', ')}
                  </p>
                </div>
                <StatusBadge status={issue.status} />
                {issue.status === 'ACKNOWLEDGED' ? null : (
                  <ActionDialog
                    title={hindi ? 'माल की पुष्टि' : 'Acknowledge material'}
                    triggerLabel={hindi ? 'पुष्टि' : 'Acknowledge'}
                    submitLabel={hindi ? 'भेजें' : 'Acknowledge'}
                    action={acknowledgeMaterialAction}
                    hidden={{ issueId: issue.id }}
                    fields={[
                      {
                        name: 'receivedWeightKg',
                        label: hindi ? 'मिला वज़न (kg)' : 'Weight received (kg)',
                        type: 'number',
                        step: '0.001',
                        required: true,
                        defaultValue: String(issue.totalIssueWeightKg),
                      },
                      {
                        name: 'shortageWeightKg',
                        label: hindi ? 'कमी (kg)' : 'Shortage (kg)',
                        type: 'number',
                        step: '0.001',
                        defaultValue: '0',
                      },
                      { name: 'signatureName', label: hindi ? 'नाम' : 'Received by', required: true },
                      { name: 'damageRemarks', label: hindi ? 'नुकसान' : 'Damage remarks', type: 'textarea', span: 2 },
                    ]}
                  />
                )}
              </div>
            ))
          )}
          {pendingIssues.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              {hindi
                ? 'पुष्टि के बाद ही माल आपकी ज़िम्मेदारी में दर्ज होता है।'
                : 'Material stays in OSWAR custody until you acknowledge the challan.'}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{hindi ? 'प्रगति भेजें' : 'Report progress'}</CardTitle>
          <CardDescription>
            {hindi
              ? 'नेटवर्क न हो तो भी अपडेट सुरक्षित रहेगा और बाद में अपने आप भेजा जाएगा।'
              : 'Updates are saved on this device when offline and sync automatically once you are back online.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <MilestoneForm jobId={job.id} language={language} />
          <div className="flex flex-wrap gap-2">
            <ActionDialog
              title={hindi ? 'जाँच के लिए दें' : 'Offer batch for inspection'}
              triggerLabel={hindi ? 'जाँच के लिए दें' : 'Offer for inspection'}
              triggerVariant="outline"
              submitLabel={hindi ? 'भेजें' : 'Request inspection'}
              action={requestInspectionAction}
              hidden={{ jobId: job.id }}
              fields={[
                {
                  name: 'type',
                  label: hindi ? 'प्रकार' : 'Inspection type',
                  type: 'select',
                  options: optionsFrom(['FIRST_ARTICLE', 'IN_PROCESS', 'FINAL']),
                  defaultValue: 'FINAL',
                },
                {
                  name: 'offeredQuantity',
                  label: hindi ? 'मात्रा' : 'Quantity offered',
                  type: 'number',
                  required: true,
                },
                { name: 'remarks', label: hindi ? 'टिप्पणी' : 'Remarks', type: 'textarea', span: 2 },
              ]}
            />
            <ActionDialog
              title={hindi ? 'देरी की सूचना' : 'Report a delay'}
              triggerLabel={hindi ? 'देरी' : 'Report delay'}
              triggerVariant="outline"
              submitLabel={hindi ? 'भेजें' : 'Report delay'}
              action={reportDelayAction}
              hidden={{ jobId: job.id, responsibility: 'PARTNER' }}
              fields={[
                {
                  name: 'reason',
                  label: hindi ? 'कारण' : 'Reason',
                  type: 'select',
                  options: DELAY_REASON_OPTIONS,
                  required: true,
                },
                { name: 'delayDays', label: hindi ? 'दिन' : 'Delay days', type: 'number', required: true },
                {
                  name: 'expectedCompletionDate',
                  label: hindi ? 'नई तारीख' : 'Expected completion',
                  type: 'date',
                },
                { name: 'detail', label: hindi ? 'विवरण' : 'Detail', type: 'textarea', span: 2 },
              ]}
            />
            <ActionDialog
              title={hindi ? 'सवाल पूछें' : 'Ask a question'}
              triggerLabel={hindi ? 'सवाल' : 'Ask a question'}
              triggerVariant="outline"
              submitLabel={hindi ? 'भेजें' : 'Send'}
              action={raiseClarificationAction}
              hidden={{ jobId: job.id }}
              fields={[
                { name: 'question', label: hindi ? 'सवाल' : 'Question', type: 'textarea', required: true, span: 2 },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {job.clarifications.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{hindi ? 'सवाल-जवाब' : 'Clarifications'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {job.clarifications.map((clarification) => (
              <div key={clarification.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{clarification.question}</p>
                  <StatusBadge status={clarification.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(clarification.raisedAt)}</p>
                {clarification.answer ? <p className="mt-2 text-sm">{clarification.answer}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {job.inspections.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{hindi ? 'जाँच' : 'Inspections'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {job.inspections.map((inspection) => (
              <div key={inspection.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{inspection.inspectionNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {humanise(inspection.type)} · {formatDateTime(inspection.requestedAt)}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatNumber(inspection.acceptedQuantity)} ok / {formatNumber(inspection.rejectedQuantity)} rej
                </span>
                <StatusBadge status={inspection.decision ?? inspection.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{hindi ? 'इतिहास' : 'History'}</CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <EmptyState title={hindi ? 'कोई अपडेट नहीं' : 'No updates yet'} />
          ) : (
            <Timeline items={timeline} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
