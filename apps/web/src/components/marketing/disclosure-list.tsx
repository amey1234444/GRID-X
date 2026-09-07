'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * The expandable capability list.
 *
 * A long feature list read as a wall of prose is skipped. Set as titles with a quiet `+`, it reads
 * as an index the visitor drives: the row is the claim, and the detail only arrives if they ask
 * for it. The `+` rotates into an `×` on open rather than swapping glyph, so the control stays in
 * one place and the row does not reflow.
 *
 * Multiple rows can be open at once — this is a reference list, not an accordion where one answer
 * replaces the last.
 */

export interface DisclosureItem {
  title: string;
  detail: string;
}

export function DisclosureList({
  label,
  items,
  className,
}: {
  label?: string;
  items: DisclosureItem[];
  className?: string;
}): React.JSX.Element {
  const [open, setOpen] = useState<string[]>([]);

  const toggle = (title: string): void =>
    setOpen((current) =>
      current.includes(title) ? current.filter((entry) => entry !== title) : [...current, title],
    );

  return (
    <div className={cn('grid gap-10 lg:grid-cols-[0.5fr_1.5fr] lg:gap-20', className)}>
      {label ? <p className="type-label pt-2">{label}</p> : <span />}

      <ul className="grid gap-x-16 gap-y-0 sm:grid-cols-2">
        {items.map((item) => {
          const isOpen = open.includes(item.title);
          return (
            <li key={item.title} className="border-b border-border-subtle">
              <button
                type="button"
                onClick={() => toggle(item.title)}
                aria-expanded={isOpen}
                className="group flex w-full items-center justify-between gap-4 py-4 text-left"
              >
                <span
                  className={cn(
                    'font-display text-[1.0625rem] font-medium tracking-[-0.025em] transition-colors',
                    isOpen ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground',
                  )}
                >
                  {item.title}
                </span>
                <Plus
                  className={cn(
                    'h-4 w-4 shrink-0 text-subtle transition-transform duration-200 ease-out-expo group-hover:text-foreground',
                    isOpen && 'rotate-45',
                  )}
                  aria-hidden
                />
              </button>

              <div
                className={cn(
                  'grid transition-all duration-200 ease-out-expo',
                  isOpen ? 'grid-rows-[1fr] pb-4 opacity-100' : 'grid-rows-[0fr] opacity-0',
                )}
              >
                <p className="overflow-hidden text-[0.8125rem] leading-relaxed text-muted-foreground">
                  {item.detail}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
