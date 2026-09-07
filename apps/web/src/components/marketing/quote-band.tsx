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
      <div className="grid gap-4 lg:grid-cols-2">
        {quotes.map((quote, index) => (
          <figure
            key={quote.name}
            className={cn(
              'flex min-h-[340px] flex-col justify-between rounded-[18px] p-8 sm:p-10',
              index === 0 ? 'quote-card-paper' : 'quote-card-signal',
            )}
          >
            <blockquote className="font-display text-[clamp(1.5rem,2.6vw,2.125rem)] font-medium leading-[1.18] tracking-[-0.035em]">
              &ldquo;{quote.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-10 flex items-center gap-3.5">
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
