import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Loading states that mirror the real layout.
 *
 * A skeleton is only worth showing if the page does not jump when the data
 * lands, so these reuse the exact heights and rhythm of the components they
 * stand in for: 28px page title, the 4-up metric strip, the 8px-tall filter
 * rail, and 44px table rows.
 */

export function PageHeaderSkeleton({ withActions = true }: { withActions?: boolean }): React.JSX.Element {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-7 w-7 rounded-input" />
          <Skeleton className="h-[22px] w-48" />
        </div>
        <Skeleton className="h-4 w-[26rem] max-w-full" />
      </div>
      {withActions ? <Skeleton className="h-9 w-28 rounded-input" /> : null}
    </div>
  );
}

export function MetricStripSkeleton({ columns = 4 }: { columns?: 2 | 3 | 4 }): React.JSX.Element {
  return (
    <div
      className={cn(
        'grid overflow-hidden rounded-card bg-card shadow-hairline',
        'divide-y divide-border-subtle sm:divide-y-0',
        'sm:[&>*]:border-l sm:[&>*]:border-border-subtle sm:[&>*:first-child]:border-l-0',
        columns === 2 && 'sm:grid-cols-2',
        columns === 3 && 'sm:grid-cols-3',
        columns === 4 && 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4',
      )}
    >
      {Array.from({ length: columns }).map((_, index) => (
        <div key={index} className="space-y-2.5 p-4">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export function ToolbarSkeleton(): React.JSX.Element {
  return (
    <div className="flex items-center gap-2 rounded-card bg-surface/60 px-2 py-2 shadow-hairline">
      <Skeleton className="h-8 w-24 rounded-control" />
      <Skeleton className="h-8 w-20 rounded-control" />
      <Skeleton className="h-8 w-24 rounded-control" />
    </div>
  );
}

export function TableSkeleton({
  rows = 8,
  columns = 6,
}: {
  rows?: number;
  columns?: number;
}): React.JSX.Element {
  return (
    <div className="overflow-hidden rounded-card bg-card shadow-hairline">
      <div className="flex h-10 items-center gap-3 border-b border-border-subtle bg-surface-elevated px-3">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton
            key={index}
            className={cn('h-3', index === 0 ? 'w-28' : 'w-20', index === columns - 1 && 'ml-auto')}
          />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex h-11 items-center gap-3 border-b border-border-subtle px-3 last:border-b-0"
          // A slight stagger reads as loading rather than as a static pattern.
          style={{ animationDelay: `${rowIndex * 60}ms` }}
        >
          {Array.from({ length: columns }).map((_, columnIndex) => (
            <Skeleton
              key={columnIndex}
              className={cn(
                'h-3.5',
                columnIndex === 0 ? 'w-32' : 'w-16',
                columnIndex === columns - 1 && 'ml-auto w-20',
              )}
            />
          ))}
        </div>
      ))}
      <div className="flex h-8 items-center px-3">
        <Skeleton className="h-2.5 w-16" />
      </div>
    </div>
  );
}

export function PanelSkeleton({ height = 260 }: { height?: number }): React.JSX.Element {
  return (
    <div className="rounded-card bg-card p-4 shadow-hairline">
      <div className="mb-4 space-y-1.5">
        <Skeleton className="h-3.5 w-36" />
        <Skeleton className="h-3 w-52" />
      </div>
      <Skeleton className="w-full rounded-input" style={{ height }} />
    </div>
  );
}

/** The default list-screen shape: header, metrics, filters, table. */
export function ListScreenSkeleton({ columns = 6 }: { columns?: number }): React.JSX.Element {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton />
      <MetricStripSkeleton />
      <ToolbarSkeleton />
      <TableSkeleton columns={columns} />
    </div>
  );
}

/** The dashboard shape: header, insight banner, metrics, two panels. */
export function DashboardSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton />
      <div className="rounded-card bg-card p-6 shadow-hairline">
        <div className="flex items-start gap-4">
          <Skeleton className="h-9 w-9 rounded-input" />
          <div className="space-y-2.5">
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
        </div>
      </div>
      <MetricStripSkeleton />
      <div className="grid gap-4 lg:grid-cols-[1.75fr_1fr]">
        <PanelSkeleton />
        <PanelSkeleton />
      </div>
    </div>
  );
}
