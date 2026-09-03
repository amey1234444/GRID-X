import { Inbox } from 'lucide-react';

import { NavIcon } from '@/components/app/nav-icon';
import { cn } from '@/lib/utils';

/**
 * Empty is a state, not an accident. It sits on the same surface as the
 * table it replaces so the layout does not jump, and always offers the
 * next action when the screen has one.
 */
export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** lucide icon name; falls back to a neutral inbox glyph. */
  icon?: string;
  className?: string;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-card bg-card px-6 py-16 text-center shadow-hairline',
        className,
      )}
    >
      {/* Faint grid, masked to a soft ellipse — signals "surface", not "error". */}
      <div className="pointer-events-none absolute inset-0 grid-pattern radial-fade opacity-[0.35]" aria-hidden />

      <div className="relative flex flex-col items-center gap-4">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-input bg-surface-elevated text-muted-foreground shadow-hairline">
          {icon ? <NavIcon name={icon} className="h-5 w-5" /> : <Inbox className="h-5 w-5" />}
        </span>
        <div className="space-y-1.5">
          <p className="type-section-title">{title}</p>
          {description ? (
            <p className="type-small mx-auto max-w-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="pt-1">{action}</div> : null}
      </div>
    </div>
  );
}
