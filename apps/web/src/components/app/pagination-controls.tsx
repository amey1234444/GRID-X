'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

/** Compact page window: 1 … 4 5 6 … 20, never more than seven targets. */
function pageWindow(page: number, totalPages: number): (number | 'gap')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const sorted = [...pages].filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);

  const result: (number | 'gap')[] = [];
  let previous = 0;
  for (const value of sorted) {
    if (previous && value - previous > 1) result.push('gap');
    result.push(value);
    previous = value;
  }
  return result;
}

export function PaginationControls({
  page,
  totalPages,
  total,
}: {
  page: number;
  totalPages: number;
  total: number;
}): React.JSX.Element | null {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  if (total === 0) return null;

  const go = (next: number): void => {
    const query = new URLSearchParams(params.toString());
    query.set('page', String(next));
    router.push(`${pathname}?${query.toString()}`);
  };

  const pages = Math.max(totalPages, 1);
  const arrow =
    'inline-flex h-8 w-8 items-center justify-center rounded-control text-muted-foreground transition-colors duration-150 hover:bg-surface-hover hover:text-foreground disabled:pointer-events-none disabled:opacity-35';

  return (
    <nav className="flex items-center justify-between gap-3" aria-label="Pagination">
      <p className="text-[0.75rem] text-subtle" data-numeric>
        {total.toLocaleString()} record{total === 1 ? '' : 's'}
      </p>

      <div className="flex items-center gap-0.5">
        <button
          type="button"
          className={arrow}
          disabled={page <= 1}
          onClick={() => go(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pageWindow(page, pages).map((entry, index) =>
          entry === 'gap' ? (
            <span key={`gap-${index}`} className="px-1 text-[0.75rem] text-subtle" aria-hidden>
              …
            </span>
          ) : (
            <button
              key={entry}
              type="button"
              onClick={() => go(entry)}
              aria-current={entry === page ? 'page' : undefined}
              className={cn(
                'inline-flex h-8 min-w-8 items-center justify-center rounded-control px-2',
                'text-[0.8125rem] tabular-nums transition-colors duration-150',
                entry === page
                  ? 'bg-surface-hover font-medium text-foreground shadow-hairline'
                  : 'text-muted-foreground hover:bg-surface-hover/70 hover:text-foreground',
              )}
            >
              {entry}
            </button>
          ),
        )}

        <button
          type="button"
          className={arrow}
          disabled={page >= pages}
          onClick={() => go(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
