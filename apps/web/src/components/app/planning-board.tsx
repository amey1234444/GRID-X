'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowRight, Check, GripVertical, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { JOB_STATUS_LABELS, JOB_STATUS_TRANSITIONS, type JobStatus } from '@gridx/shared';

import { moveJobStageAction } from '@/app/actions/control';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate, formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { JobRow } from '@/lib/types';

/**
 * Section 24 — the planning board.
 *
 * The board is the one screen where a planner changes many jobs quickly, so the move has to be
 * the gesture itself: pick a card up, drop it in another lane. Three things make that trustworthy
 * rather than alarming:
 *
 *   1. Only lanes the workflow actually allows light up while a card is held; the rest dim to a
 *      third of their weight, so the legal moves are the ones the eye lands on.
 *   2. The card moves the instant it is dropped and the server call runs behind it. If the API
 *      refuses, the card animates back to where it came from and the reason is shown — the board
 *      never sits still pretending to be saving.
 *   3. Every drag has a keyboard and touch equal: the ⋮ menu on each card lists the same legal
 *      destinations, so the board is not a mouse-only feature.
 *
 * Dragging is built on pointer events rather than HTML5 drag-and-drop because the latter has no
 * touch support and no control over the drag image.
 */

/** Lanes in workflow order. Terminal states (closed, cancelled) are not planning work. */
const LANES: { status: JobStatus; hint: string }[] = [
  { status: 'DRAFT', hint: 'Not yet offered' },
  { status: 'AWAITING_PARTNER_ACCEPTANCE', hint: 'With the partner' },
  { status: 'ACCEPTED', hint: 'Partner committed' },
  { status: 'MATERIAL_PENDING', hint: 'Waiting on steel' },
  { status: 'MATERIAL_ISSUED', hint: 'Material with partner' },
  { status: 'IN_PRODUCTION', hint: 'On the floor' },
  { status: 'INSPECTION_REQUESTED', hint: 'Awaiting inspector' },
  { status: 'UNDER_INSPECTION', hint: 'Being inspected' },
  { status: 'REWORK', hint: 'Back to the partner' },
  { status: 'QUALITY_ACCEPTED', hint: 'Passed inspection' },
  { status: 'DISPATCHED', hint: 'In transit' },
  { status: 'RECEIVED', hint: 'Back in plant' },
];

const LANE_STATUSES = new Set<string>(LANES.map((lane) => lane.status));

/** Lane accents. Colour marks the stages that need attention, not every stage. */
const LANE_TONE: Partial<Record<JobStatus, string>> = {
  AWAITING_PARTNER_ACCEPTANCE: 'bg-warning',
  INSPECTION_REQUESTED: 'bg-warning',
  UNDER_INSPECTION: 'bg-warning',
  REWORK: 'bg-destructive',
  QUALITY_ACCEPTED: 'bg-success',
  RECEIVED: 'bg-success',
};

const PRIORITY_TONE: Record<string, string> = {
  CRITICAL: 'text-destructive',
  HIGH: 'text-warning',
};

/** Where a held card may legally land, including the lane it started in. */
function destinationsFor(status: string): Set<string> {
  const allowed = JOB_STATUS_TRANSITIONS[status as JobStatus] ?? [];
  return new Set<string>([status, ...allowed.filter((next) => LANE_STATUSES.has(next))]);
}

/** Legal destinations excluding the current lane — what the move menu offers. */
function moveOptionsFor(status: string): JobStatus[] {
  return (JOB_STATUS_TRANSITIONS[status as JobStatus] ?? []).filter((next) =>
    LANE_STATUSES.has(next),
  );
}

interface DragState {
  jobId: string;
  from: JobStatus;
  /** Lane currently under the pointer, whether or not the drop is legal. */
  over: string | null;
  x: number;
  y: number;
  /** Pointer offset within the card, so the card does not jump on pick-up. */
  offsetX: number;
  offsetY: number;
  width: number;
}

export function PlanningBoard({ jobs }: { jobs: JobRow[] }): React.JSX.Element {
  const router = useRouter();

  /** Statuses moved in this session, layered over the server data until it catches up. */
  const [overrides, setOverrides] = React.useState<Record<string, JobStatus>>({});
  const [pending, setPending] = React.useState<Record<string, true>>({});
  const [drag, setDrag] = React.useState<DragState | null>(null);

  const scrollerRef = React.useRef<HTMLDivElement>(null);
  /** Set once the pointer has travelled far enough to mean "drag", not "click". */
  const draggingRef = React.useRef(false);

  const statusOf = React.useCallback(
    (job: JobRow): JobStatus => overrides[job.id] ?? (job.status as JobStatus),
    [overrides],
  );

  // Server data is the truth. Once a revalidated page arrives carrying the new status, the local
  // override for that job has done its job and is dropped — otherwise a later change made
  // elsewhere would be masked by a stale override for the rest of the session.
  React.useEffect(() => {
    setOverrides((current) => {
      const next: Record<string, JobStatus> = {};
      let changed = false;
      for (const job of jobs) {
        const override = current[job.id];
        if (override === undefined) continue;
        if (override === job.status) changed = true;
        else next[job.id] = override;
      }
      if (Object.keys(current).length !== Object.keys(next).length) changed = true;
      return changed ? next : current;
    });
  }, [jobs]);

  const byLane = React.useMemo(() => {
    const map = new Map<string, JobRow[]>();
    for (const lane of LANES) map.set(lane.status, []);
    for (const job of jobs) {
      const bucket = map.get(statusOf(job));
      if (bucket) bucket.push(job);
    }
    for (const bucket of map.values()) {
      // Overdue first, then by due date: the lane reads top-down as "deal with this next".
      bucket.sort((a, b) => {
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
        return a.dueDate.localeCompare(b.dueDate);
      });
    }
    return map;
  }, [jobs, statusOf]);

  const commitMove = React.useCallback(
    (job: JobRow, to: JobStatus) => {
      const from = statusOf(job);
      if (from === to) return;

      setOverrides((current) => ({ ...current, [job.id]: to }));
      setPending((current) => ({ ...current, [job.id]: true }));

      void moveJobStageAction(job.id, to)
        .then((result) => {
          if (result.error) {
            // Put the card back where the planner took it from and say why.
            setOverrides((current) => {
              const next = { ...current };
              if (from === job.status) delete next[job.id];
              else next[job.id] = from;
              return next;
            });
            toast.error(`${job.jobNumber} stayed in ${JOB_STATUS_LABELS[from]}`, {
              description: result.error,
            });
            return;
          }
          toast.success(`${job.jobNumber} → ${JOB_STATUS_LABELS[to]}`);
          router.refresh();
        })
        .finally(() => {
          setPending((current) => {
            const next = { ...current };
            delete next[job.id];
            return next;
          });
        });
    },
    [router, statusOf],
  );

  /* ---- Pointer dragging ------------------------------------------------ */

  const laneUnder = (x: number, y: number): string | null => {
    const element = document.elementFromPoint(x, y);
    const lane = element?.closest<HTMLElement>('[data-lane]');
    return lane?.dataset.lane ?? null;
  };

  /** Nudge the board sideways when a held card reaches either edge. */
  const autoScroll = (x: number): void => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const box = scroller.getBoundingClientRect();
    const margin = 96;
    if (x < box.left + margin) scroller.scrollLeft -= Math.ceil((box.left + margin - x) / 6);
    else if (x > box.right - margin) scroller.scrollLeft += Math.ceil((x - (box.right - margin)) / 6);
  };

  const startDrag = (event: React.PointerEvent<HTMLDivElement>, job: JobRow): void => {
    // Left button only, and never from the menu button inside the card.
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest('[data-no-drag]')) return;

    const card = event.currentTarget;
    const box = card.getBoundingClientRect();
    const originX = event.clientX;
    const originY = event.clientY;
    const from = statusOf(job);
    draggingRef.current = false;

    const move = (native: PointerEvent): void => {
      const travelled = Math.hypot(native.clientX - originX, native.clientY - originY);
      if (!draggingRef.current) {
        if (travelled < 6) return;
        draggingRef.current = true;
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'grabbing';
      }
      autoScroll(native.clientX);
      setDrag({
        jobId: job.id,
        from,
        over: laneUnder(native.clientX, native.clientY),
        x: native.clientX,
        y: native.clientY,
        offsetX: originX - box.left,
        offsetY: originY - box.top,
        width: box.width,
      });
    };

    const finish = (native: PointerEvent): void => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', cancel);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';

      if (draggingRef.current) {
        const target = laneUnder(native.clientX, native.clientY);
        if (target && target !== from && destinationsFor(from).has(target)) {
          commitMove(job, target as JobStatus);
        } else if (target && target !== from) {
          toast.error(`Cannot move ${job.jobNumber} to ${JOB_STATUS_LABELS[target as JobStatus]}`, {
            description: `A job in ${JOB_STATUS_LABELS[from]} can only go to ${
              moveOptionsFor(from).map((next) => JOB_STATUS_LABELS[next]).join(', ') || 'no other stage'
            }.`,
          });
        }
      }
      setDrag(null);
      // Let the click that follows this pointerup see the flag, then clear it.
      window.setTimeout(() => {
        draggingRef.current = false;
      }, 0);
    };

    const cancel = (): void => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', cancel);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      setDrag(null);
      draggingRef.current = false;
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', cancel);
  };

  const held = drag ? jobs.find((job) => job.id === drag.jobId) ?? null : null;
  const allowed = drag ? destinationsFor(drag.from) : null;

  return (
    <>
      <div
        ref={scrollerRef}
        className={cn(
          'flex gap-3 overflow-x-auto pb-4',
          drag && 'select-none [scrollbar-width:none]',
        )}
      >
        {LANES.map((lane) => {
          const laneJobs = byLane.get(lane.status) ?? [];
          const overdue = laneJobs.filter((job) => job.isOverdue).length;
          const isLegal = !allowed || allowed.has(lane.status);
          const isSource = drag?.from === lane.status;
          const isHovered = drag?.over === lane.status && !isSource;
          const isTarget = isHovered && isLegal;

          return (
            <section
              key={lane.status}
              data-lane={lane.status}
              className={cn(
                'flex w-[286px] shrink-0 flex-col rounded-card bg-card shadow-hairline surface-sheen',
                'transition-[opacity,box-shadow,background-color] duration-200 ease-out-expo',
                // While a card is held, lanes that cannot receive it recede. They stay
                // hit-testable on purpose: dropping on one explains why it is not allowed,
                // which teaches the workflow instead of silently swallowing the gesture.
                drag && !isLegal && 'opacity-30',
                drag && !isLegal && isHovered && 'opacity-45 shadow-[inset_0_0_0_1px_hsl(var(--destructive)/0.5)]',
                isTarget && 'bg-surface-elevated shadow-[inset_0_0_0_1px_hsl(var(--brand)/0.55)]',
                drag &&
                  isLegal &&
                  !isTarget &&
                  !isSource &&
                  'shadow-[inset_0_0_0_1px_hsl(var(--border-strong))]',
              )}
            >
              <header className="flex items-start justify-between gap-2 border-b border-border-subtle px-3.5 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'h-1.5 w-1.5 shrink-0 rounded-full',
                        LANE_TONE[lane.status] ?? 'bg-border-strong',
                      )}
                      aria-hidden
                    />
                    <h2 className="truncate text-[0.8125rem] font-medium">
                      {JOB_STATUS_LABELS[lane.status]}
                    </h2>
                  </div>
                  <p className="mt-0.5 pl-3.5 text-[0.6875rem] text-subtle">{lane.hint}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {overdue > 0 ? (
                    <Badge variant="destructive" size="sm" title={`${overdue} overdue`}>
                      {overdue}
                    </Badge>
                  ) : null}
                  <span className="tabular-nums text-[0.75rem] text-muted-foreground">
                    {laneJobs.length}
                  </span>
                </div>
              </header>

              <div className="flex min-h-[120px] flex-col gap-2 p-2.5">
                {laneJobs.length === 0 ? (
                  <p
                    className={cn(
                      'rounded-input border border-dashed border-border-subtle py-6 text-center text-[0.75rem] text-subtle',
                      isTarget && 'border-brand/50 text-muted-foreground',
                    )}
                  >
                    {isTarget ? 'Drop here' : 'Empty'}
                  </p>
                ) : (
                  laneJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      status={lane.status}
                      lifted={drag?.jobId === job.id}
                      saving={pending[job.id] === true}
                      onPointerDown={(event) => startDrag(event, job)}
                      onClickCapture={(event) => {
                        if (draggingRef.current) {
                          event.preventDefault();
                          event.stopPropagation();
                        }
                      }}
                      onMove={(to) => commitMove(job, to)}
                    />
                  ))
                )}

                {isTarget && laneJobs.length > 0 ? (
                  <div className="rounded-input border border-dashed border-brand/50 py-3 text-center text-[0.75rem] text-muted-foreground">
                    Drop here
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>

      {/* The held card, following the pointer. Rendered outside the lanes so it is never clipped
          by a lane's bounds, and transparent to hit-testing so the lane underneath is found. */}
      {drag && held ? (
        <div
          className="pointer-events-none fixed z-50"
          style={{
            left: drag.x - drag.offsetX,
            top: drag.y - drag.offsetY,
            width: drag.width,
          }}
        >
          <div className="rotate-[1.5deg] scale-[1.02] rounded-input bg-surface-elevated p-3 shadow-elevated ring-1 ring-brand/50">
            <CardBody job={held} />
          </div>
        </div>
      ) : null}
    </>
  );
}

/* ---- Card ------------------------------------------------------------- */

function CardBody({ job }: { job: JobRow }): React.JSX.Element {
  return (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-[0.8125rem] font-medium tabular-nums">{job.jobNumber}</span>
        <span
          className={cn(
            'shrink-0 text-[0.6875rem] font-medium',
            PRIORITY_TONE[job.priority] ?? 'text-subtle',
          )}
        >
          {job.priority === 'NORMAL' ? '' : job.priority.toLowerCase()}
        </span>
      </div>

      <p className="mt-1 truncate text-[0.75rem] text-muted-foreground" title={job.componentName}>
        {job.componentCode} · {job.componentName}
      </p>

      <div className="mt-2 flex items-center justify-between gap-2 text-[0.6875rem]">
        <span className={cn('truncate', job.partnerName ? 'text-muted-foreground' : 'text-warning')}>
          {job.partnerName ?? 'Unallocated'}
        </span>
        <span className="shrink-0 tabular-nums text-subtle">{formatNumber(job.quantity)} pcs</span>
      </div>

      <div className="mt-1.5 flex items-center gap-1.5 text-[0.6875rem]">
        {job.isOverdue ? (
          <AlertTriangle className="h-3 w-3 shrink-0 text-destructive" aria-hidden />
        ) : null}
        <span className={job.isOverdue ? 'font-medium text-destructive' : 'text-subtle'}>
          Due {formatDate(job.dueDate)}
          {job.isOverdue && job.delayDays > 0 ? ` · ${job.delayDays}d late` : ''}
        </span>
      </div>
    </>
  );
}

function JobCard({
  job,
  status,
  lifted,
  saving,
  onPointerDown,
  onClickCapture,
  onMove,
}: {
  job: JobRow;
  status: JobStatus;
  lifted: boolean;
  saving: boolean;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onClickCapture: (event: React.MouseEvent) => void;
  onMove: (to: JobStatus) => void;
}): React.JSX.Element {
  const options = moveOptionsFor(status);

  return (
    <div
      onPointerDown={onPointerDown}
      onClickCapture={onClickCapture}
      className={cn(
        'group relative cursor-grab touch-none rounded-input bg-surface p-3',
        'shadow-[inset_0_0_0_1px_hsl(var(--border-subtle))]',
        'transition-[background-color,box-shadow,opacity] duration-200 ease-out-expo',
        'hover:bg-surface-elevated hover:shadow-[inset_0_0_0_1px_hsl(var(--border-strong))]',
        // The original stays in place as a ghost so the planner keeps their bearings.
        lifted && 'opacity-30',
        saving && 'opacity-70',
      )}
    >
      <Link
        href={`/app/production/jobs/${job.id}`}
        className="absolute inset-0 rounded-input focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        aria-label={`Open job ${job.jobNumber}`}
        tabIndex={0}
      />

      <div className="relative pointer-events-none">
        <CardBody job={job} />
      </div>

      <div className="absolute right-2 top-2 flex items-center gap-0.5">
        {saving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden />
        ) : null}
        <GripVertical
          className="h-3.5 w-3.5 text-subtle opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden
        />
        {options.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              data-no-drag
              aria-label={`Move ${job.jobNumber} to another stage`}
              className={cn(
                'relative rounded-control px-1 py-0.5 text-[0.6875rem] text-muted-foreground',
                'opacity-0 transition-[opacity,background-color] hover:bg-surface-active hover:text-foreground',
                'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                'group-hover:opacity-100 data-[state=open]:opacity-100',
              )}
            >
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {options.map((next) => (
                <DropdownMenuItem
                  key={next}
                  onSelect={() => onMove(next)}
                  className="justify-between"
                >
                  {JOB_STATUS_LABELS[next]}
                  <Check className="h-3.5 w-3.5 opacity-0" aria-hidden />
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  );
}
