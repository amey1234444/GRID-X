import Link from 'next/link';
import { JOB_STATUS_LABELS, type JobStatus } from '@gridx/shared';

import { EmptyState } from '@/components/app/empty-state';
import { PageHeader } from '@/components/app/page-header';
import { PlanningBoard } from '@/components/app/planning-board';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, formatNumber, humanise } from '@/lib/format';
import { apiGet } from '@/lib/session';
import { emptyPage, type JobRow, type Paginated } from '@/lib/types';

export const metadata = { title: 'Planning board · GRID-X' };

/** Stages that mean the job is out of the plant's hands and waiting on someone else. */
const WAITING_ON_OTHERS: JobStatus[] = [
  'AWAITING_PARTNER_ACCEPTANCE',
  'INSPECTION_REQUESTED',
  'MATERIAL_PENDING',
];

export default async function PlanningBoardPage(): Promise<React.JSX.Element> {
  const jobs = await apiGet<Paginated<JobRow>>('/jobs?pageSize=200', emptyPage<JobRow>());

  const open = jobs.data.filter(
    (job) => !['CLOSED', 'CANCELLED'].includes(job.status),
  );
  const waiting = open.filter((job) => WAITING_ON_OTHERS.includes(job.status as JobStatus));
  const inProduction = open.filter((job) => job.status === 'IN_PRODUCTION');
  const overdue = open.filter((job) => job.isOverdue);
  const unallocated = open.filter((job) => job.partnerId === null);
  const rework = open.filter((job) => job.status === 'REWORK');

  const attention = [...unallocated, ...rework]
    .filter((job, index, all) => all.findIndex((other) => other.id === job.id) === index)
    .sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
      return a.dueDate.localeCompare(b.dueDate);
    });

  return (
    <div className="space-y-6">
      <PageHeader
        icon="Cog"
        title="Planning board"
        description="Every open job by workflow stage. Drag a card into another lane to advance it — only the moves the workflow allows will accept a drop."
        meta={
          <Badge variant="secondary" dot>
            {formatNumber(open.length)} open
          </Badge>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open jobs" value={formatNumber(open.length)} icon="Cog" hint="on the board" />
        <StatCard
          label="Waiting on someone"
          value={formatNumber(waiting.length)}
          tone="warning"
          icon="Clock"
          hint="acceptance, material or inspection"
        />
        <StatCard
          label="In production"
          value={formatNumber(inProduction.length)}
          icon="Factory"
          hint="on the floor now"
        />
        <StatCard
          label="Overdue"
          value={formatNumber(overdue.length)}
          tone={overdue.length > 0 ? 'destructive' : 'default'}
          icon="AlertTriangle"
          hint="past the promised date"
        />
      </div>

      {open.length === 0 ? (
        <EmptyState
          title="No jobs to plan"
          description="Create and allocate jobs to populate the planning board."
        />
      ) : (
        <PlanningBoard jobs={open} />
      )}

      {attention.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Needs a decision</CardTitle>
            <CardDescription>
              Jobs with no partner behind them, and jobs sent back for rework. Neither moves on its
              own.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {attention.slice(0, 20).map((job) => (
              <Link
                key={job.id}
                href={`/app/production/jobs/${job.id}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-input p-2.5 text-sm shadow-[inset_0_0_0_1px_hsl(var(--border-subtle))] transition-colors duration-200 hover:bg-surface-hover"
              >
                <span className="font-medium tabular-nums">{job.jobNumber}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {job.componentName}
                </span>
                {job.partnerId === null ? (
                  <Badge variant="warning" size="sm">
                    Unallocated
                  </Badge>
                ) : null}
                <StatusBadge status={job.status} />
                <span className="text-[0.6875rem] text-subtle">{humanise(job.priority)}</span>
                <span
                  className={`text-[0.6875rem] tabular-nums ${
                    job.isOverdue ? 'font-medium text-destructive' : 'text-subtle'
                  }`}
                >
                  {formatDate(job.dueDate)}
                </span>
              </Link>
            ))}
            {attention.length > 20 ? (
              <p className="pt-1 text-[0.75rem] text-subtle">
                +{formatNumber(attention.length - 20)} more — see{' '}
                <Link href="/app/production/jobs" className="underline hover:text-foreground">
                  all jobs
                </Link>
                .
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <p className="text-[0.75rem] text-subtle">
        Lanes follow the job workflow: {JOB_STATUS_LABELS.DRAFT} → {JOB_STATUS_LABELS.ACCEPTED} →{' '}
        {JOB_STATUS_LABELS.IN_PRODUCTION} → {JOB_STATUS_LABELS.QUALITY_ACCEPTED} →{' '}
        {JOB_STATUS_LABELS.RECEIVED}. Closed and cancelled jobs leave the board.
      </p>
    </div>
  );
}
