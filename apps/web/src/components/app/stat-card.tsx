import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

import { NavIcon } from '@/components/app/nav-icon';
import { cn } from '@/lib/utils';

export type StatTone = 'default' | 'success' | 'warning' | 'destructive' | 'info';

const TONE_ACCENT: Record<StatTone, string> = {
  default: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  info: 'bg-info',
};

const TONE_TEXT: Record<StatTone, string> = {
  default: 'text-foreground',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
  info: 'text-info',
};

/**
 * A metric tile, not a card of text. The value dominates; the label is a
 * quiet eyebrow above it and the delta is the only coloured element unless
 * the metric itself is an alarm. A 2px accent rail carries the tone so the
 * number stays legible instead of being tinted.
 */
export function StatCard({
  label,
  value,
  hint,
  trend,
  tone = 'default',
  icon,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  trend?: { value: string; direction: 'up' | 'down' | 'flat' };
  tone?: StatTone;
  /** lucide icon name, shown ghosted in the corner. */
  icon?: string;
  className?: string;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-card bg-card p-4 shadow-hairline surface-sheen',
        'transition-[background-color,box-shadow] duration-200 ease-out-expo hover:bg-surface-elevated',
        className,
      )}
    >
      <span
        className={cn(
          'absolute inset-y-0 left-0 w-[2px] opacity-60 transition-opacity duration-200 group-hover:opacity-100',
          TONE_ACCENT[tone],
        )}
        aria-hidden
      />

      {icon ? (
        <NavIcon
          name={icon}
          className="absolute right-3 top-3 h-4 w-4 text-muted-foreground opacity-25 transition-opacity duration-200 group-hover:opacity-45"
        />
      ) : null}

      <p className="type-label">{label}</p>

      <p className={cn('type-metric mt-2.5', TONE_TEXT[tone])} data-numeric>
        {value}
      </p>

      {trend || hint ? (
        <div className="mt-2 flex items-center gap-1.5 text-[0.75rem] text-subtle">
          {trend ? (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 font-medium tabular-nums',
                trend.direction === 'up' && 'text-success',
                trend.direction === 'down' && 'text-destructive',
                trend.direction === 'flat' && 'text-muted-foreground',
              )}
            >
              {trend.direction === 'up' ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : trend.direction === 'down' ? (
                <ArrowDownRight className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              {trend.value}
            </span>
          ) : null}
          {hint ? <span className="truncate">{hint}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Metric tiles are rarely equal in importance. `StatRow` lets a screen
 * lead with one primary figure and trail the supporting ones, instead of
 * laying four identical boxes across the top.
 */
export function StatRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-4', className)}>{children}</div>
  );
}
