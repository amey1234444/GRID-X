import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Timeline, type TimelineItem } from '@/components/app/timeline';
import { formatDateTime, humanise } from '@/lib/format';
import { apiGet } from '@/lib/session';
import { emptyPage, type AuditLogRow, type Paginated } from '@/lib/types';

const NEGATIVE = ['REJECT', 'DECLINE', 'SUSPEND', 'CANCEL', 'HOLD', 'SCRAP', 'DELETE'];
const CAUTION = ['REWORK', 'DEVIATION', 'DELAY', 'SHORTAGE', 'OBSOLETE', 'REVISE'];
const POSITIVE = ['ACCEPT', 'APPROVE', 'RELEASE', 'COMPLETE', 'PAY', 'ACKNOWLEDGE', 'RECONCILE'];

function tone(action: string): TimelineItem['tone'] {
  const value = action.toUpperCase();
  if (NEGATIVE.some((word) => value.includes(word))) return 'destructive';
  if (CAUTION.some((word) => value.includes(word))) return 'warning';
  if (POSITIVE.some((word) => value.includes(word))) return 'success';
  return 'default';
}

/**
 * The audit trail for one record, read straight off the append-only log so a
 * detail page shows who did what without a second source of truth. Renders
 * nothing when the log is empty or the viewer cannot read it — an empty
 * "no activity" panel on every page is worse than no panel.
 */
export async function ActivityTrail({
  entityType,
  entityId,
  limit = 8,
  title = 'Activity',
}: {
  entityType: string;
  entityId: string;
  limit?: number;
  title?: string;
}): Promise<React.JSX.Element | null> {
  const query = new URLSearchParams({
    entityType,
    entityId,
    page: '1',
    pageSize: String(limit),
  });

  const logs = await apiGet<Paginated<AuditLogRow>>(
    `/audit-logs?${query.toString()}`,
    emptyPage<AuditLogRow>(),
  );

  if (logs.data.length === 0) return null;

  const items: TimelineItem[] = logs.data.map((row) => ({
    id: row.id,
    title: humanise(row.action),
    timestamp: formatDateTime(row.createdAt),
    description: row.actorLabel ?? 'System',
    tone: tone(row.action),
  }));

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle>{title}</CardTitle>
        <span className="type-label">
          {logs.total > logs.data.length ? `latest ${logs.data.length} of ${logs.total}` : `${logs.total} entries`}
        </span>
      </CardHeader>
      <CardContent>
        <Timeline items={items} />
      </CardContent>
    </Card>
  );
}
