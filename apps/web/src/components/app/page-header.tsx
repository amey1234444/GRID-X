import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { NavIcon } from '@/components/app/nav-icon';
import { cn } from '@/lib/utils';

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * Every screen opens with the same identity block: a typed glyph, the
 * record name, and the actions that belong to it. Description text is
 * optional and deliberately quiet — the title and the data carry the page.
 */
export function PageHeader({
  title,
  description,
  actions,
  icon,
  breadcrumbs,
  meta,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  /** lucide icon name, matching the nav entry this screen belongs to. */
  icon?: string;
  breadcrumbs?: Crumb[];
  /** Inline status/count chips that sit beside the title. */
  meta?: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn('space-y-3', className)}>
      {breadcrumbs?.length ? (
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-[0.75rem] text-subtle">
            {breadcrumbs.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                {index > 0 ? <ChevronRight className="h-3 w-3 opacity-50" aria-hidden /> : null}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="rounded-control px-1 py-0.5 transition-colors hover:bg-surface-hover hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="px-1 py-0.5 text-muted-foreground">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2.5">
            {icon ? (
              <span
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-input bg-surface-elevated text-muted-foreground shadow-hairline"
                aria-hidden
              >
                <NavIcon name={icon} className="h-4 w-4" />
              </span>
            ) : null}
            <h1 className="type-page-title truncate">{title}</h1>
            {meta ? <div className="flex shrink-0 items-center gap-1.5">{meta}</div> : null}
          </div>
          {description ? (
            <p className="type-small max-w-2xl text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}
