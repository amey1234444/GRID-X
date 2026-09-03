import Link from 'next/link';
import { ArrowRight, type LucideIcon } from 'lucide-react';

import { NavIcon } from '@/components/app/nav-icon';
import { cn } from '@/lib/utils';

/**
 * Dashboard composition primitives.
 *
 * A dashboard is a hierarchy, not a grid of equal boxes:
 *
 *   InsightBanner   — the one thing that decides whether you keep reading
 *   MetricStrip     — supporting figures, dense and unboxed
 *   Panel           — a titled region for a chart or a table
 *
 * Nothing here is a `Card`. Boxing every figure is exactly what makes an
 * admin dashboard look like an admin dashboard.
 */

type Tone = 'default' | 'success' | 'warning' | 'destructive' | 'info';

const TONE_TEXT: Record<Tone, string> = {
  default: 'text-foreground',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
  info: 'text-info',
};

const TONE_GLOW: Record<Tone, string> = {
  default: 'from-primary/[0.10]',
  success: 'from-success/[0.10]',
  warning: 'from-warning/[0.12]',
  destructive: 'from-destructive/[0.12]',
  info: 'from-info/[0.10]',
};

const TONE_ICON: Record<Tone, string> = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  info: 'bg-info/10 text-info',
};

/**
 * The lead statement. One per dashboard: what needs attention right now,
 * stated as a sentence with a number, plus the action that resolves it.
 */
export function InsightBanner({
  eyebrow,
  headline,
  detail,
  tone = 'default',
  icon,
  action,
  aside,
}: {
  eyebrow: string;
  headline: React.ReactNode;
  detail?: string;
  tone?: Tone;
  /** lucide icon name. */
  icon?: string;
  action?: { label: string; href: string };
  /** Secondary figures pinned to the right of the banner. */
  aside?: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="relative flex h-full min-h-[238px] overflow-hidden rounded-card border-l-2 border-brand/70 bg-card p-5 shadow-hairline surface-sheen sm:p-6">
      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/70 to-transparent"
        aria-hidden
      />
      {/* Directional wash — signals tone without tinting the text. */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent',
          TONE_GLOW[tone],
        )}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 grid-pattern opacity-[0.25]"
        aria-hidden
      />

      <div className="relative flex w-full flex-col justify-between gap-5 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-start gap-4">
          {icon ? (
            <span
              className={cn(
                'mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-input',
                TONE_ICON[tone],
              )}
              aria-hidden
            >
              <NavIcon name={icon} className="h-[18px] w-[18px]" />
            </span>
          ) : null}

          <div className="min-w-0 space-y-1.5">
            <p className="type-label">{eyebrow}</p>
            <h2
              className={cn(
                'font-display text-[1.5rem] font-medium leading-tight tracking-[-0.03em]',
                TONE_TEXT[tone],
              )}
            >
              {headline}
            </h2>
            {detail ? <p className="type-small max-w-xl text-muted-foreground">{detail}</p> : null}
            {action ? (
              <Link
                href={action.href}
                className="inline-flex items-center gap-1 pt-1 text-[0.8125rem] font-medium text-primary underline-offset-4 transition-colors hover:underline"
              >
                {action.label}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : null}
          </div>
        </div>

        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
    </section>
  );
}

/**
 * Dense metric row. Hairline dividers instead of card borders, so a run of
 * figures reads as one instrument cluster rather than six separate widgets.
 */
export function MetricStrip({
  children,
  columns = 4,
  className,
}: {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'grid overflow-hidden rounded-card border-t border-border-strong bg-card shadow-hairline',
        'divide-y divide-border-subtle sm:divide-y-0',
        'sm:[&>*]:border-l sm:[&>*]:border-border-subtle sm:[&>*:first-child]:border-l-0',
        columns === 2 && 'sm:grid-cols-2',
        columns === 3 && 'sm:grid-cols-3',
        columns === 4 && 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4',
        // On the 2x2 mobile grid the third tile starts a new row, so reset its rule.
        columns === 4 && 'sm:[&>*:nth-child(3)]:border-l-0 lg:[&>*:nth-child(3)]:border-l',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function MetricItem({
  label,
  value,
  hint,
  tone = 'default',
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
  /** Turns the whole cell into a drill-down target. */
  href?: string;
}): React.JSX.Element {
  const body = (
    <>
      <p className="type-label truncate">{label}</p>
      <p className={cn('type-metric mt-2', TONE_TEXT[tone])} data-numeric>
        {value}
      </p>
      {hint ? <p className="mt-1.5 truncate text-[0.75rem] text-subtle">{hint}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group block p-4 transition-colors duration-150 hover:bg-surface-elevated"
      >
        {body}
        <span className="mt-2 inline-flex items-center gap-1 text-[0.75rem] text-subtle opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          View
          <ArrowRight className="h-3 w-3" />
        </span>
      </Link>
    );
  }

  return <div className="p-4">{body}</div>;
}

/**
 * A titled region. Used for charts and embedded tables so both sit on the
 * same rhythm without each inventing its own header.
 */
export function Panel({
  title,
  description,
  action,
  icon: Icon,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  description?: string;
  action?: { label: string; href: string };
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}): React.JSX.Element {
  return (
    <section
      className={cn(
        'flex flex-col overflow-hidden rounded-card border-t border-border-strong bg-card shadow-hairline',
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
        <div className="flex min-w-0 items-center gap-2">
          {Icon ? <Icon className="h-4 w-4 shrink-0 text-subtle" /> : null}
          <div className="min-w-0">
            <h3 className="font-display text-sm font-medium tracking-[-0.02em] truncate">
              {title}
            </h3>
            {description ? (
              <p className="mt-0.5 truncate text-[0.75rem] text-subtle">{description}</p>
            ) : null}
          </div>
        </div>
        {action ? (
          <Link
            href={action.href}
            className="inline-flex shrink-0 items-center gap-1 rounded-control px-1.5 py-1 text-[0.75rem] text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            {action.label}
            <ArrowRight className="h-3 w-3" />
          </Link>
        ) : null}
      </header>
      <div className={cn('flex-1 px-4 pb-4', bodyClassName)}>{children}</div>
    </section>
  );
}

/** Consistent placeholder for a panel whose data has not accrued yet. */
export function PanelEmpty({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <p className="flex min-h-[180px] items-center justify-center px-4 text-center text-[0.8125rem] text-subtle">
      {children}
    </p>
  );
}
