import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';

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
        className="absolute inset-0 h-full w-full object-cover opacity-75"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/media/gridx-control-network-poster.webp"
        aria-hidden="true"
        tabIndex={-1}
      >
        <source src="/media/gridx-control-network.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0.2),rgba(5,5,5,0.2)_34%,rgba(5,5,5,0.97)_92%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_16%,transparent,rgba(5,5,5,0.2)_46%,rgba(5,5,5,0.68)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#080808] to-transparent" />

      <div
        className={cn(
          'container relative z-10 flex min-h-[inherit] flex-col justify-end',
          compact ? 'pb-14 sm:pb-18' : 'pb-16 sm:pb-20',
        )}
      >
        <div className="max-w-[760px]">
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.13em] text-muted-foreground">
            {eyebrow}
          </p>
          <Heading className="mt-6 text-balance text-[clamp(3rem,5.3vw,4.5rem)] font-medium leading-[1] tracking-[-0.045em]">
            {title}
          </Heading>
          {description ? (
            <p className="mt-6 max-w-xl text-[0.9375rem] leading-7 text-muted-foreground sm:text-base">
              {description}
            </p>
          ) : null}
          <Link
            href={href}
            className="mt-7 inline-flex items-center gap-2 text-[0.8125rem] font-medium text-foreground transition-colors hover:text-white"
          >
            {linkLabel} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
