import Link from 'next/link';

import { PageHeader } from '@/components/app/page-header';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { EmptyState } from '@/components/app/empty-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, formatNumber, humanise } from '@/lib/format';
import { apiGet } from '@/lib/session';
import { emptyPage, type JobRow, type Paginated } from '@/lib/types';

export const metadata = { title: 'Planning board · GRID-X' };

const LANES: { status: string; label: string }[] = [
  { status: 'DRAFT', label: 'Draft' },
  { status: 'PLANNED', label: 'Planned' },
  { status: 'AWAITING_PARTNER_ACCEPTANCE', label: 'Awaiting acceptance' },
  { status: 'ACCEPTED', label: 'Accepted' },
  { status: 'MATERIAL_ISSUED', label: 'Material issued' },
  { status: 'IN_PRODUCTION', label: 'In production' },
  { status: 'READY_FOR_INSPECTION', label: 'Ready for inspection' },
  { status: 'QUALITY_ACCEPTED', label: 'Quality accepted' },
  { status: 'DISPATCHED', label: 'Dispatched' },
];

export default async function PlanningBoardPage(): Promise<React.JSX.Element> {
  const jobs = await apiGet<Paginated<JobRow>>('/jobs?pageSize=200', emptyPage<JobRow>());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planning board"
        description="Live view of every open job by workflow stage — spot bottlenecks and unallocated work at a glance."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open jobs" value={formatNumber(jobs.data.length)} />
        <StatCard
          label="Awaiting acceptance"
          value={formatNumber(jobs.data.filter((job) => job.status === 'AWAITING_PARTNER_ACCEPTANCE').length)}
          tone="warning"
        />
        <StatCard
          label="In production"
          value={formatNumber(jobs.data.filter((job) => job.status === 'IN_PRODUCTION').length)}
        />
        <StatCard
          label="Overdue"
          value={formatNumber(jobs.data.filter((job) => job.isOverdue).length)}
          tone="destructive"
        />
      </div>

      {jobs.data.length === 0 ? (
        <EmptyState title="No jobs to plan" description="Create jobs to populate the planning board." />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {LANES.map((lane) => {
            const laneJobs = jobs.data.filter((job) => job.status === lane.status);
            return (
              <Card key={lane.status} className="min-w-[280px] flex-1">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-sm">
                    {lane.label}
                    <Badge variant="secondary">{laneJobs.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {laneJobs.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nothing here.</p>
                  ) : (
                    laneJobs.map((job) => (
                      <Link
                        key={job.id}
                        href={`/app/production/jobs/${job.id}`}
                        className="block rounded-lg border p-3 transition hover:border-primary/50 hover:bg-secondary/50"
                      >
                        <p className="text-sm font-medium">{job.jobNumber}</p>
                        <p className="text-xs text-muted-foreground">{job.componentCode}</p>
                        <p className="mt-1 text-xs">
                          {job.partnerName ?? 'Unallocated'} · {formatNumber(job.quantity)} pcs
                        </p>
                        <p
                          className={`text-xs ${job.isOverdue ? 'font-medium text-destructive' : 'text-muted-foreground'}`}
                        >
                          Due {formatDate(job.dueDate)}
                        </p>
                      </Link>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Blocked &amp; unallocated</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {jobs.data
            .filter((job) => job.partnerId === null || job.status === 'ON_HOLD')
            .slice(0, 20)
            .map((job) => (
              <Link
                key={job.id}
                href={`/app/production/jobs/${job.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm hover:bg-secondary/50"
              >
                <span className="font-medium">{job.jobNumber}</span>
                <span className="text-muted-foreground">{job.componentName}</span>
                <StatusBadge status={job.status} />
                <span className="text-xs text-muted-foreground">{humanise(job.priority)}</span>
              </Link>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
