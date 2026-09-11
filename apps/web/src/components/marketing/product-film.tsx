import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { CinematicBackground } from './cinematic-background';
import { cn } from '@/lib/utils';

const filmStages = ['Allocate', 'Release', 'Reconcile', 'Inspect', 'Approve'];

export function ProductFilm({
  eyebrow,
  title,
  description,
  href = '/platform',
  linkLabel = 'Explore the platform',
  className,
  compact = false,
  id,
  as: Heading = 'h2',
}: {
  eyebrow: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  className?: string;
  compact?: boolean;
  id?: string;
  as?: 'h1' | 'h2';
}): React.JSX.Element {
  return (
    <section
      id={id}
      className={cn(
        'marketing-film cinematic-film relative isolate overflow-hidden border-y border-border-subtle bg-black',
        compact ? 'min-h-[620px]' : 'min-h-[760px] lg:min-h-[820px]',
        Heading === 'h1' && 'cinematic-hero',
        className,
      )}
    >
      <CinematicBackground priority={Heading === 'h1'} />

      <div className="container absolute inset-x-0 top-8 z-10 sm:top-10">
        <div className="flex items-center justify-between border-t border-white/15 pt-4">
          <div className="hidden items-center gap-5 sm:flex">
            {filmStages.map((stage, index) => (
              <div key={stage} className="flex items-center gap-2">
                <span
                  className="film-stage-dot h-1.5 w-1.5 rounded-full bg-white/25"
                  style={{ animationDelay: `${index * 1.05}s` }}
                />
                <span className="font-mono text-[0.5625rem] uppercase tracking-[0.11em] text-white/45">
                  {stage}
                </span>
              </div>
            ))}
          </div>
          <span className="ml-auto flex items-center gap-2 font-mono text-[0.5625rem] uppercase tracking-[0.12em] text-white/55">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-signal" />
            Live network
          </span>
        </div>
      </div>

      <div
        className={cn(
          'container cinematic-film__content relative z-10 flex min-h-[inherit] flex-col justify-end',
          compact ? 'pb-14 sm:pb-18' : 'pb-16 sm:pb-20',
        )}
      >
        <div className="max-w-[680px]">
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.13em] text-white/55">
            {eyebrow}
          </p>
          <Heading className="mt-5 text-balance text-[clamp(2.45rem,4.1vw,3.5rem)] font-medium leading-[1.02] tracking-[-0.04em]">
            {title}
          </Heading>
          {description ? (
            <p className="mt-5 max-w-xl text-[0.875rem] leading-6 text-white/55 sm:text-[0.9375rem]">
              {description}
            </p>
          ) : null}
          <Link
            href={href}
            className="mt-6 inline-flex items-center gap-2 text-[0.75rem] font-medium text-white/80 transition-colors hover:text-white"
          >
            {linkLabel} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
