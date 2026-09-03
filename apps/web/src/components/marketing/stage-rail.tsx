'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

export interface Stage {
  id: string;
  label: string;
  /** Two-tone statement: `lead` in foreground, `trail` in muted. */
  lead: string;
  trail: string;
  panels: { title: string; detail: string; visual?: React.ReactNode }[];
}

/**
 * The stage rail.
 *
 * A sticky index of the operating flow on the left, with each stage's detail
 * scrolling past on the right. It does two jobs at once: it tells you how
 * long the story is, and it keeps your place inside it — which a stack of
 * anonymous marketing sections never does.
 *
 * Scroll position drives the active stage via IntersectionObserver rather
 * than a scroll handler, so it costs nothing on the main thread.
 */
export function StageRail({ stages }: { stages: Stage[] }): React.JSX.Element {
  const [active, setActive] = useState(stages[0]?.id ?? '');
  const sectionRefs = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Choose the entry closest to the top of the viewport band, so a tall
        // stage does not keep the previous one selected on the way past.
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const first = visible[0];
        if (first?.target instanceof HTMLElement) {
          const id = first.target.dataset.stage;
          if (id) setActive(id);
        }
      },
      { rootMargin: '-25% 0px -55% 0px', threshold: 0 },
    );

    for (const node of sectionRefs.current.values()) observer.observe(node);
    return () => observer.disconnect();
  }, [stages]);

  const scrollTo = (id: string): void => {
    sectionRefs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="container grid gap-8 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-16">
      {/* Sticky index — collapses to a horizontal scroller on small screens. */}
      <nav
        aria-label="Platform stages"
        className={cn(
          'lg:sticky lg:top-24 lg:h-fit lg:self-start',
          '-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0',
        )}
      >
        <ul className="flex gap-2 lg:flex-col lg:gap-0">
          {stages.map((stage, index) => {
            const isActive = stage.id === active;
            return (
              <li key={stage.id} className="shrink-0 lg:shrink">
                <button
                  type="button"
                  onClick={() => scrollTo(stage.id)}
                  aria-current={isActive ? 'true' : undefined}
                  className={cn(
                    'relative w-full whitespace-nowrap rounded-lg px-3 py-2.5 text-left',
                    'text-[0.9375rem] leading-snug transition-colors duration-300 ease-out-expo',
                    isActive
                      ? 'bg-surface-hover font-medium text-foreground lg:bg-transparent'
                      : 'text-subtle hover:text-muted-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'absolute inset-y-1 left-0 hidden w-[2px] bg-brand transition-transform duration-300 ease-out-expo lg:block',
                      isActive ? 'scale-y-100' : 'scale-y-0',
                    )}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      'mr-2 font-mono text-[0.6875rem]',
                      isActive ? 'text-brand' : 'text-subtle',
                    )}
                  >
                    0{index + 1}
                  </span>
                  {stage.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="min-w-0 space-y-16 lg:space-y-24">
        {stages.map((stage, index) => (
          <section
            key={stage.id}
            data-stage={stage.id}
            ref={(node) => {
              if (node) sectionRefs.current.set(stage.id, node);
              else sectionRefs.current.delete(stage.id);
            }}
            className="linear-frame relative scroll-mt-28 space-y-8 overflow-hidden rounded-[18px] border border-border-strong p-5 sm:p-8 lg:p-10"
          >
            <div className="flex items-start gap-4 sm:gap-6">
              <span className="mt-1 font-mono text-[0.75rem] font-medium text-brand">
                0{index + 1}
              </span>
              <h3 className="max-w-2xl text-balance font-display text-[clamp(1.65rem,3.2vw,2.75rem)] font-medium leading-[1.04] tracking-[-0.045em]">
                <span className="text-foreground">{stage.lead}</span>{' '}
                <span className="text-subtle">{stage.trail}</span>
              </h3>
            </div>

            <div className="grid gap-px overflow-hidden rounded-xl border border-border-subtle bg-border-subtle sm:grid-cols-2">
              {stage.panels.map((panel) => (
                <article key={panel.title} className="bg-[#0e0e0e] p-5 sm:p-6">
                  <h4 className="font-display text-[0.9375rem] font-medium tracking-[-0.02em]">
                    {panel.title}
                  </h4>
                  <p className="mt-1.5 text-[0.875rem] leading-relaxed text-muted-foreground">
                    {panel.detail}
                  </p>
                  {panel.visual ? <div className="mt-5">{panel.visual}</div> : null}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
