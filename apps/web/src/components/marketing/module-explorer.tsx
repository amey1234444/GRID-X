'use client';

import { ArrowUpRight, CheckCircle2, CircleDot, FileStack, Gauge, ShieldCheck } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface ProductModule {
  id: string;
  eyebrow: string;
  title: string;
  summary: string;
  outcome: string;
  points: string[];
  rows: { label: string; value: string; tone?: 'live' | 'warning' | 'neutral' }[];
}

const icons = [Gauge, FileStack, CircleDot, ShieldCheck];

function ModuleSurface({ module }: { module: ProductModule }): React.JSX.Element {
  return (
    <div className="overflow-hidden rounded-xl border border-border-strong bg-[#0b0b0b] shadow-product">
      <div className="flex h-11 items-center border-b border-border-subtle px-4">
        <span className="h-1.5 w-1.5 rounded-full bg-signal" />
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
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  row.tone === 'live'
                    ? 'bg-success'
                    : row.tone === 'warning'
                      ? 'bg-warning'
                      : 'bg-muted-foreground',
                )}
              />
              <span className="text-[0.75rem] text-muted-foreground">{row.label}</span>
            </div>
            <span className="font-mono text-[0.625rem] text-foreground">{row.value}</span>
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
        const Icon = icons[index % icons.length] ?? Gauge;
        return (
          <Dialog key={module.id}>
            <DialogTrigger asChild>
              <button
                id={module.id}
                type="button"
                className="group flex min-h-[340px] scroll-mt-24 flex-col bg-[#0c0c0c] p-6 text-left transition-colors duration-200 hover:bg-[#111111] sm:p-7"
              >
                <div className="flex items-start justify-between">
                  <span className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-muted-foreground transition-colors group-hover:text-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="font-mono text-[0.5625rem] tracking-[0.12em] text-subtle">
                    0{index + 1}
                  </span>
                </div>
                <p className="mt-12 font-mono text-[0.5625rem] uppercase tracking-[0.12em] text-subtle">
                  {module.eyebrow}
                </p>
                <h3 className="mt-3 max-w-xs text-[1.35rem] font-medium leading-tight tracking-[-0.035em]">
                  {module.title}
                </h3>
                <p className="mt-3 max-w-sm text-[0.8125rem] leading-6 text-muted-foreground">
                  {module.summary}
                </p>
                <span className="mt-auto inline-flex items-center gap-2 pt-8 text-[0.75rem] font-medium text-foreground">
                  View technical spec
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </button>
            </DialogTrigger>

            <DialogContent className="!bottom-3 !left-auto !right-3 !top-3 max-h-[calc(100vh-1.5rem)] !w-[min(760px,calc(100vw-1.5rem))] !max-w-none !translate-x-0 !translate-y-0 overflow-y-auto rounded-[18px] bg-[#0d0d0d] p-0 sm:!bottom-5 sm:!right-5 sm:!top-5 sm:!w-[min(760px,calc(100vw-2.5rem))]">
              <div className="border-b border-border-subtle px-6 py-5 sm:px-9">
                <p className="font-mono text-[0.5625rem] uppercase tracking-[0.13em] text-subtle">
                  Technical specification / {String(index + 1).padStart(2, '0')}
                </p>
              </div>
              <div className="px-6 pb-8 pt-10 sm:px-9 sm:pb-10 sm:pt-14">
                <DialogTitle className="max-w-xl text-balance text-[clamp(2.6rem,5vw,4rem)] font-medium leading-[1] tracking-[-0.045em]">
                  {module.title}
                </DialogTitle>
                <DialogDescription className="mt-6 max-w-2xl text-[0.9375rem] leading-7">
                  {module.summary}
                </DialogDescription>

                <div className="mt-10 rounded-xl border border-border-subtle bg-surface p-5">
                  <p className="font-mono text-[0.5625rem] uppercase tracking-[0.12em] text-subtle">
                    Control outcome
                  </p>
                  <p className="mt-3 text-[1.125rem] font-medium leading-7 tracking-[-0.025em]">
                    {module.outcome}
                  </p>
                </div>

                <div className="mt-6">
                  <ModuleSurface module={module} />
                </div>

                <div className="mt-9 grid gap-3 sm:grid-cols-2">
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
