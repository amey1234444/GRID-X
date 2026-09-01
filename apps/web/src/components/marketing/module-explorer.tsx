'use client';

import { ArrowUpRight, CheckCircle2, Gauge, type LucideIcon } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * The module explorer.
 *
 * Each card previously carried an icon, a label, a title and a paragraph — six
 * of them in a row, all the same shape, with the one line that actually
 * distinguishes a module (the rule it enforces) hidden behind a click. So the
 * grid described the product without showing any of it, and the six cards were
 * interchangeable at a glance.
 *
 * The rule now leads on the card, set in foreground text, and a two-row extract
 * of the module's live record sits underneath it. That extract is the point: it
 * is the same data the dialog shows in full, so the card proves the claim
 * instead of promising that a dialog will. The dialog remains the place for the
 * full record and the control list.
 */

export interface ProductModule {
  id: string;
  eyebrow: string;
  title: string;
  summary: string;
  outcome: string;
  points: string[];
  rows: { label: string; value: string; tone?: 'live' | 'warning' | 'neutral' }[];
  /** Passed by the page so six modules do not share four cycled icons. */
  icon?: LucideIcon;
}

function ToneDot({ tone }: { tone?: 'live' | 'warning' | 'neutral' }): React.JSX.Element {
  return (
    <span
      className={cn(
        'h-1.5 w-1.5 shrink-0 rounded-full',
        tone === 'live' ? 'bg-success' : tone === 'warning' ? 'bg-warning' : 'bg-muted-foreground',
      )}
      aria-hidden
    />
  );
}

/** The full record, shown inside the dialog. */
function ModuleSurface({ module }: { module: ProductModule }): React.JSX.Element {
  return (
    <div className="plate plate-lit overflow-hidden rounded-xl border border-border-strong shadow-product">
      <div className="flex h-11 items-center border-b border-border-subtle px-4">
        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-success" />
        <p className="ml-2 font-mono text-[0.5625rem] uppercase tracking-[0.11em] text-subtle">
          Live system record
        </p>
        <span className="ml-auto font-mono text-[0.5625rem] text-subtle">
          {module.id.toUpperCase()}
        </span>
      </div>
      <div className="p-3">
        {module.rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-border-subtle px-2 py-3 last:border-b-0"
          >
            <div className="flex items-center gap-2.5">
              <ToneDot tone={row.tone} />
              <span className="text-[0.75rem] text-muted-foreground">{row.label}</span>
            </div>
            <span
              className={cn(
                'font-mono text-[0.625rem] tabular-nums',
                row.tone === 'warning' ? 'text-warning' : 'text-foreground',
              )}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ModuleExplorer({ modules }: { modules: ProductModule[] }): React.JSX.Element {
  return (
    <div className="grid gap-px overflow-hidden rounded-[18px] border border-border-strong bg-border-subtle md:grid-cols-2 lg:grid-cols-3">
      {modules.map((module, index) => {
        const Icon = module.icon ?? Gauge;
        const preview = module.rows.slice(0, 2);

        return (
          <Dialog key={module.id}>
            <DialogTrigger asChild>
              <button
                id={module.id}
                type="button"
                className={cn(
                  'plate plate-lit group flex min-h-[368px] scroll-mt-24 flex-col p-6 text-left sm:p-7',
                  'transition-[background-color,transform] duration-300 ease-out-expo',
                  'hover:z-10 hover:bg-[#111111] lg:hover:-translate-y-0.5',
                  '[&::before]:opacity-60 [&::before]:transition-opacity [&::before]:duration-300',
                  'hover:[&::before]:opacity-100',
                  'focus-visible:z-10 focus-visible:bg-[#111111]',
                )}
              >
                <div className="flex items-start justify-between">
                  <span className="grid h-9 w-9 place-items-center rounded-lg border border-border-strong bg-surface text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="font-mono text-[0.5625rem] tracking-[0.14em] text-subtle">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>

                <p className="mt-8 font-mono text-[0.5625rem] uppercase tracking-[0.12em] text-subtle">
                  {module.eyebrow}
                </p>
                <h3 className="mt-3 max-w-xs font-display text-[1.35rem] font-medium leading-tight tracking-[-0.035em]">
                  {module.title}
                </h3>

                {/* The rule is the line that distinguishes one module from another,
                    so it leads rather than sitting behind a click. */}
                <p className="mt-3.5 max-w-sm text-[0.8125rem] leading-6 text-foreground">
                  {module.outcome}
                </p>

                {/* Two rows of the real record, so the card carries evidence itself. */}
                {preview.length > 0 ? (
                  <div className="mt-6 rounded-lg border border-border-subtle bg-black/25 px-3 py-1">
                    {preview.map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center gap-2.5 border-b border-border-subtle py-2 last:border-b-0"
                      >
                        <ToneDot tone={row.tone} />
                        <span className="min-w-0 flex-1 truncate text-[0.6875rem] text-muted-foreground">
                          {row.label}
                        </span>
                        <span
                          className={cn(
                            'shrink-0 font-mono text-[0.625rem] tabular-nums',
                            row.tone === 'warning' ? 'text-warning' : 'text-foreground',
                          )}
                        >
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}

                <span className="mt-auto inline-flex items-center gap-2 pt-7 text-[0.75rem] font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                  View technical spec
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 ease-out-expo group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </button>
            </DialogTrigger>

            <DialogContent className="!bottom-3 !left-auto !right-3 !top-3 max-h-[calc(100vh-1.5rem)] !w-[min(760px,calc(100vw-1.5rem))] !max-w-none !translate-x-0 !translate-y-0 overflow-y-auto rounded-[18px] bg-[#0d0d0d] p-0 sm:!bottom-5 sm:!right-5 sm:!top-5 sm:!w-[min(760px,calc(100vw-2.5rem))]">
              <div className="flex items-center justify-between gap-4 border-b border-border-subtle px-6 py-5 sm:px-9">
                <p className="font-mono text-[0.5625rem] uppercase tracking-[0.13em] text-subtle">
                  Technical specification / {String(index + 1).padStart(2, '0')}
                </p>
                <p className="font-mono text-[0.5625rem] uppercase tracking-[0.13em] text-subtle">
                  {module.eyebrow}
                </p>
              </div>

              <div className="px-6 pb-8 pt-10 sm:px-9 sm:pb-10 sm:pt-14">
                <DialogTitle className="max-w-xl text-balance font-display text-[clamp(2.4rem,4.6vw,3.6rem)] font-medium leading-[1] tracking-[-0.045em]">
                  {module.title}
                </DialogTitle>
                <DialogDescription className="mt-6 max-w-2xl text-[0.9375rem] leading-7">
                  {module.summary}
                </DialogDescription>

                <div className="plate-recessed mt-10 rounded-xl border border-border-strong p-5">
                  <p className="font-mono text-[0.5625rem] uppercase tracking-[0.12em] text-subtle">
                    The rule this module enforces
                  </p>
                  <p className="mt-3 font-display text-[1.125rem] font-medium leading-7 tracking-[-0.025em]">
                    {module.outcome}
                  </p>
                </div>

                <div className="mt-6">
                  <ModuleSurface module={module} />
                </div>

                <p className="mt-10 font-mono text-[0.5625rem] uppercase tracking-[0.12em] text-subtle">
                  Controls
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {module.points.map((point) => (
                    <div
                      key={point}
                      className="flex items-start gap-3 border-t border-border-subtle pt-4 text-[0.8125rem] leading-6 text-muted-foreground"
                    >
                      <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-foreground" />
                      {point}
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );
      })}
    </div>
  );
}
