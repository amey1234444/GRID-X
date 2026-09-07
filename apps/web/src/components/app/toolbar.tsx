'use client';

import * as React from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * The view toolbar.
 *
 * Two visually distinct rows sit above every collection screen:
 *   1. `Toolbar`     — what you are looking at + what you can do with it.
 *   2. `ToolbarRail` — how it is currently sliced (sort, filters, density).
 *
 * Both are built from `ToolbarChip`: a low-contrast pill that reads as a
 * control without competing with the primary action or the data below.
 */

export function Toolbar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>{children}</div>
  );
}

export function ToolbarSpacer(): React.JSX.Element {
  return <div className="flex-1" />;
}

/** Hairline divider between chip clusters inside one row. */
export function ToolbarDivider(): React.JSX.Element {
  return <div className="mx-0.5 h-4 w-px bg-border" aria-hidden />;
}

export function ToolbarRail({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-card bg-surface/60 px-2 py-2 shadow-hairline',
        className,
      )}
    >
      {children}
    </div>
  );
}

const chipBase = [
  'group inline-flex h-8 items-center gap-1.5 rounded-control px-2.5',
  'text-[0.8125rem] leading-none whitespace-nowrap',
  'transition-[background-color,box-shadow,color] duration-150 ease-out-expo',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-1 focus-visible:ring-offset-background',
  'disabled:pointer-events-none disabled:opacity-45',
].join(' ');

export interface ToolbarChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: LucideIcon;
  /** Dimmed prefix, e.g. "Sorted by" before the value. */
  label?: string;
  /** Renders a trailing chevron for anything that opens a menu. */
  caret?: boolean;
  /** Count pill on the right, e.g. the `+1` on Attio's sort chip. */
  count?: number;
  active?: boolean;
  tone?: 'default' | 'ghost';
}

export const ToolbarChip = React.forwardRef<HTMLButtonElement, ToolbarChipProps>(
  (
    { icon: Icon, label, caret = false, count, active = false, tone = 'default', className, children, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      type="button"
      data-active={active || undefined}
      className={cn(
        chipBase,
        tone === 'default'
          ? 'bg-surface-elevated text-muted-foreground shadow-hairline hover:bg-surface-hover hover:text-foreground'
          : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground',
        active &&
          'bg-primary/10 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.28)] hover:bg-primary/15 hover:text-primary',
        className,
      )}
      {...props}
    >
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" /> : null}
      {label ? <span className="text-subtle">{label}</span> : null}
      {children ? <span className="font-medium text-foreground">{children}</span> : null}
      {typeof count === 'number' && count > 0 ? (
        <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-[4px] bg-surface-active px-1 text-[10px] font-medium text-muted-foreground">
          +{count}
        </span>
      ) : null}
      {caret ? (
        <ChevronDown className="h-3 w-3 shrink-0 opacity-50 transition-transform duration-150 group-data-[state=open]:rotate-180" />
      ) : null}
    </button>
  ),
);
ToolbarChip.displayName = 'ToolbarChip';

/**
 * Non-interactive counterpart — same silhouette as a chip so a static
 * summary ("10 records") aligns with the controls beside it.
 */
export function ToolbarStat({
  icon: Icon,
  children,
  className,
}: {
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-control px-2.5 text-[0.8125rem] leading-none text-subtle',
        className,
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5 opacity-60" /> : null}
      {children}
    </span>
  );
}
