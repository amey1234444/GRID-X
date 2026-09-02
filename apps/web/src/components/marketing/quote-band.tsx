import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * The testimonial pair.
 *
 * Two cards, deliberately not both dark: one paper-white and one in the signal tint, so the band
 * reads as a pause in a page that is otherwise unbroken graphite. The quote is set large and the
 * attribution sits at the foot of the card, which keeps the eye on the claim rather than on who
 * made it.
 *
 * A footnote line underneath carries the scale claim and one link out, mirroring how a customer
 * band earns its place: proof, then somewhere to go.
 */

export interface Quote {
  quote: string;
  name: string;
  role: string;
  /** Two or three initials, used as a stand-in for a partner mark. */
  initials: string;
}

export function QuoteBand({
  quotes,
  footnote,
  action,
  className,
}: {
  quotes: [Quote, Quote];
  footnote?: React.ReactNode;
  action?: { label: string; href: string };
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn('flex flex-col gap-10', className)}>
      <div className="grid gap-3 lg:grid-cols-[1.08fr_0.92fr]">
        {quotes.map((quote, index) => (
          <figure
            key={quote.name}
            className={cn(
              'relative isolate flex min-h-[420px] flex-col overflow-hidden rounded-[18px] p-8 sm:p-10',
              index === 0 ? 'quote-card-paper' : 'quote-card-signal',
            )}
          >
            <div className="relative z-10 flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 font-mono text-[0.5625rem] uppercase tracking-[0.12em] opacity-55">
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {index === 0 ? 'One released revision' : 'Reconciled before approval'}
              </span>
              <span className="font-mono text-[0.5rem] tracking-[0.12em] opacity-25">
                0{index + 1}
              </span>
            </div>
            <span
              className="pointer-events-none absolute -right-3 top-10 font-serif text-[12rem] leading-none opacity-[0.035]"
              aria-hidden
            >
              &ldquo;
            </span>
            <blockquote className="relative z-10 mt-16 max-w-[44rem] font-display text-[clamp(1.65rem,2.7vw,2.4rem)] font-medium leading-[1.14] tracking-[-0.045em]">
              &ldquo;{quote.quote}&rdquo;
            </blockquote>
            <figcaption className="relative z-10 mt-auto flex items-end justify-between gap-5 border-t border-current/10 pt-7">
              <span className="flex min-w-0 items-center gap-3.5">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-current/15 font-mono text-[0.625rem] font-medium uppercase tracking-[0.06em] opacity-80"
                  aria-hidden
                >
                  {quote.initials}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[0.875rem] font-medium">{quote.name}</span>
                  <span className="truncate text-[0.8125rem] opacity-70">{quote.role}</span>
                </span>
              </span>
              <span className="hidden max-w-[10rem] text-right font-mono text-[0.5rem] uppercase leading-4 tracking-[0.08em] opacity-35 sm:block">
                {index === 0 ? 'Same print / every viewer' : 'Material closed / invoice ready'}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>

      {footnote || action ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {footnote ? (
            <p className="text-[0.9375rem] leading-relaxed text-muted-foreground">{footnote}</p>
          ) : (
            <span />
          )}
          {action ? (
            <Link
              href={action.href}
              className="inline-flex shrink-0 items-center gap-2 text-[0.9375rem] font-medium text-foreground transition-colors hover:text-brand"
            >
              {action.label} <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
