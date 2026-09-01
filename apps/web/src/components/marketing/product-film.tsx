import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

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
        'marketing-film relative isolate overflow-hidden border-y border-border-subtle bg-black',
        compact ? 'min-h-[620px]' : 'min-h-[760px] lg:min-h-[820px]',
        className,
      )}
    >
      <video
        className="absolute inset-0 h-full w-full object-cover opacity-[0.92]"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/media/gridx-control-network-poster.webp?v=2"
        aria-hidden="true"
        tabIndex={-1}
      >
        <source src="/media/gridx-control-network.mp4?v=2" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0.04),rgba(5,5,5,0.08)_42%,rgba(5,5,5,0.88)_96%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_30%,transparent,rgba(5,5,5,0.08)_52%,rgba(5,5,5,0.52)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#080808] via-[#080808]/65 to-transparent" />

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
          'container relative z-10 flex min-h-[inherit] flex-col justify-end',
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
