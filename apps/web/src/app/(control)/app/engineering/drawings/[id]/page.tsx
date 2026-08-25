import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DRAWING_ACCESS_MODES } from '@gridx/shared';

import {
  createRevisionAction,
  grantDrawingAccessAction,
  raiseEngineeringChangeAction,
  releaseRevisionAction,
  revisionStageAction,
  revokeDrawingAccessAction,
} from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { DrawingAccessLog } from '@/components/app/drawing-access-log';
import { DrawingViewer } from '@/components/app/drawing-viewer';
import { DetailList } from '@/components/app/detail-list';
import { EmptyState } from '@/components/app/empty-state';
import { PageHeader } from '@/components/app/page-header';
import { StatusBadge } from '@/components/app/status-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, formatDateTime } from '@/lib/format';
import { optionsFrom } from '@/lib/options';
import { partnerOptions } from '@/lib/reference';
import { apiFetch } from '@/lib/session';
import type { DrawingDetail } from '@/lib/types';

export default async function DrawingDetailPage({
  params,
}: {
  params: { id: string };
}): Promise<React.JSX.Element> {
  const [result, partners] = await Promise.all([
    apiFetch<DrawingDetail>(`/drawings/${params.id}`),
    partnerOptions(),
  ]);
  const drawing = result.data;
  if (!drawing) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        icon="Ruler"
        title={drawing.drawingNumber}
        description={drawing.title}
        actions={
          <>
          <ActionDialog
            title="Add revision"
            description="A new revision starts in draft and must be reviewed, approved and released before partners can see it."
            triggerLabel="Add revision"
            action={createRevisionAction}
            hidden={{ drawingId: drawing.id }}
            fields={[
              { name: 'revisionCode', label: 'Revision code', required: true, placeholder: 'B' },
              {
                name: 'fileId',
                label: 'Drawing file',
                type: 'file',
                category: 'DRAWING',
                accept: 'application/pdf,image/*',
                required: true,
                help: 'PDF or image. Partners only ever see the file attached here.',
                span: 2,
              },
              { name: 'issueDate', label: 'Issue date', type: 'date' },
              { name: 'expiryDate', label: 'Expiry date', type: 'date' },
              { name: 'changeNote', label: 'Change note', type: 'textarea', span: 2 },
            ]}
          />
          <ActionDialog
            title="Raise engineering change"
            triggerLabel="Raise change"
            triggerVariant="outline"
            action={raiseEngineeringChangeAction}
            hidden={{ drawingId: drawing.id }}
            fields={[
              { name: 'title', label: 'Title', required: true, span: 2 },
              { name: 'description', label: 'Description', type: 'textarea', required: true, span: 2 },
              { name: 'impact', label: 'Impact on running jobs', type: 'textarea', span: 2 },
            ]}
          />
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Drawing</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList
            columns={3}
            items={[
              {
                label: 'Component',
                value: drawing.component ? (
                  <Link
                    href={`/app/engineering/components/${drawing.component.id}`}
                    className="text-primary hover:underline"
                  >
                    {drawing.component.componentCode} · {drawing.component.name}
                  </Link>
                ) : (
                  '—'
                ),
              },
              { label: 'Revisions', value: String(drawing.revisions.length) },
              { label: 'Description', value: drawing.description ?? '—' },
            ]}
          />
        </CardContent>
      </Card>

      {drawing.revisions.length === 0 ? (
        <EmptyState
          title="No revisions yet"
          description="Upload the first revision to start the draft → review → approved → released flow."
        />
      ) : (
        <div className="space-y-4">
          {drawing.revisions.map((revision) => (
            <Card key={revision.id}>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-3">
                  Revision {revision.revisionCode}
                  <StatusBadge status={revision.status} />
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <DrawingViewer revisionId={revision.id} allowDownload />
                  <DrawingAccessLog revisionId={revision.id} />
                  {revision.status === 'DRAFT' ? (
                    <ActionDialog
                      title="Submit for review"
                      triggerLabel="Submit for review"
                      triggerSize="sm"
                      triggerVariant="outline"
                      action={revisionStageAction}
                      hidden={{ revisionId: revision.id, drawingId: drawing.id, stage: 'submit' }}
                      fields={[]}
                    />
                  ) : null}
                  {revision.status === 'IN_REVIEW' ? (
                    <ActionDialog
                      title="Approve revision"
                      triggerLabel="Approve"
                      triggerSize="sm"
                      action={revisionStageAction}
                      hidden={{ revisionId: revision.id, drawingId: drawing.id, stage: 'approve' }}
                      fields={[]}
                    />
                  ) : null}
                  {revision.status === 'APPROVED' ? (
                    <ActionDialog
                      title="Release revision"
                      description="Releasing supersedes the previous revision, moves every open job onto this one, carries the partners’ access across and notifies them to acknowledge it."
                      triggerLabel="Release"
                      triggerSize="sm"
                      action={releaseRevisionAction}
                      hidden={{ revisionId: revision.id, drawingId: drawing.id }}
                      fields={[
                        { name: 'issueDate', label: 'Issue date', type: 'date' },
                        { name: 'expiryDate', label: 'Expiry date', type: 'date' },
                      ]}
                    />
                  ) : null}
                  {revision.status === 'RELEASED' ? (
                    <ActionDialog
                      title="Grant partner access"
                      description="Access is logged. View-only prevents downloads."
                      triggerLabel="Grant access"
                      triggerSize="sm"
                      triggerVariant="outline"
                      action={grantDrawingAccessAction}
                      hidden={{ revisionId: revision.id, drawingId: drawing.id }}
                      fields={[
                        { name: 'partnerId', label: 'Partner', type: 'select', required: true, options: partners, span: 2 },
                        { name: 'mode', label: 'Mode', type: 'select', options: optionsFrom(DRAWING_ACCESS_MODES), defaultValue: 'VIEW_ONLY' },
                        { name: 'expiresAt', label: 'Expires at', type: 'date' },
                      ]}
                    />
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <DetailList
                  columns={3}
                  items={[
                    { label: 'Change note', value: revision.changeNote ?? '—' },
                    { label: 'Issue date', value: formatDate(revision.issueDate) },
                    { label: 'Expiry', value: formatDate(revision.expiryDate) },
                    { label: 'Released', value: formatDateTime(revision.releasedAt) },
                    { label: 'Created', value: formatDateTime(revision.createdAt) },
                  ]}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Partner access
                    </p>
                    {revision.access.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No partner has access.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {revision.access.map((entry) => (
                          <li key={entry.id} className="flex items-center gap-2">
                            <Badge variant={entry.revokedAt ? 'destructive' : 'outline'}>
                              {entry.partner?.businessName ?? 'Unknown'} · {entry.mode === 'VIEW_ONLY' ? 'View' : 'Download'}
                              {entry.revokedAt ? ' · revoked' : ''}
                            </Badge>
                            {entry.revokedAt ? null : (
                              <ActionDialog
                                title="Revoke drawing access"
                                description="The partner immediately loses the ability to open this revision."
                                triggerLabel="Revoke"
                                triggerSize="sm"
                                triggerVariant="ghost"
                                submitLabel="Revoke access"
                                action={revokeDrawingAccessAction}
                                hidden={{ accessId: entry.id, drawingId: drawing.id }}
                                fields={[]}
                              />
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Acknowledgements
                    </p>
                    {revision.acknowledgements.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Awaiting partner acknowledgement.</p>
                    ) : (
                      <ul className="space-y-1 text-sm">
                        {revision.acknowledgements.map((ack) => (
                          <li key={ack.id}>
                            {ack.partner?.businessName ?? 'Unknown'} · {formatDateTime(ack.acknowledgedAt)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
