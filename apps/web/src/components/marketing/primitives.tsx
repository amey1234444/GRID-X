import { cn } from '@/lib/utils';

import { AmbientLines } from './ambient-lines';

/**
 * Marketing primitives.
 *
 * The landing page speaks in three registers: a quiet eyebrow, a two-tone
 * statement, and dense supporting bands. Keeping them here stops each
 * section reinventing its own type scale.
 */

export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-control bg-surface-elevated px-2 py-1',
        'font-mono text-[0.625rem] font-medium uppercase tracking-[0.12em] text-muted-foreground shadow-hairline',
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * The signature statement: an assertion in full contrast, followed by its
 * qualification in muted. Reads as one sentence, weighted.
 */
export function Statement({
  lead,
  trail,
  as: Tag = 'h2',
  className,
}: {
  lead: string;
  trail?: string;
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
}): React.JSX.Element {
  return (
    <Tag className={cn('type-hero text-balance', className)}>
      <span className="text-foreground">{lead}</span>
      {trail ? <span className="text-subtle"> {trail}</span> : null}
    </Tag>
  );
}

/** Full-bleed dark band for a single centred assertion. */
export function StatementBand({
  eyebrow,
  children,
  className,
  tone = 'dark',
}: {
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
  tone?: 'dark' | 'light';
}): React.JSX.Element {
  return (
    <section
      className={cn(
        'relative overflow-hidden border-y border-border-subtle py-28 sm:py-36',
        tone === 'light' ? 'statement-band-light' : 'section-graphite',
        className,
      )}
    >
      {tone === 'dark' ? <AmbientLines variant="routes" className="opacity-40" /> : null}
      <div className="container relative flex flex-col items-center gap-5 text-center">
        {eyebrow ? <p className="type-label">{eyebrow}</p> : null}
        {children}
      </div>
    </section>
  );
}

/** Dense figure band — hairline-separated, never boxed. */
export function MetricBand({
  items,
  className,
}: {
  items: { value: string; label: string }[];
  className?: string;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'grid divide-y divide-border-subtle sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4',
        'sm:[&>*]:border-l sm:[&>*]:border-border-subtle sm:[&>*:first-child]:border-l-0',
        'sm:[&>*:nth-child(3)]:border-l-0 lg:[&>*:nth-child(3)]:border-l',
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="px-0 py-6 sm:px-6 sm:py-4 lg:py-6">
          <p
            className="font-display text-[1.875rem] font-medium leading-none tracking-[-0.04em]"
            data-numeric
          >
            {item.value}
          </p>
          <p className="mt-2 text-[0.8125rem] leading-snug text-muted-foreground">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * Feature band — a row of short claims used as a rhythm break between long
 * scrolling sections.
 *
 * It was previously a flat grid of small icons over hairline dividers, which at
 * five across read as a footer rather than as a statement: the icon was the
 * largest element in each cell and the claim itself was set at the same size as
 * its own explanation.
 *
 * Now each cell is a lit plate carrying an index, so the band scans as a
 * numbered set; the claim steps up to display type and the detail steps down
 * and greys out, which is what actually creates the hierarchy. The icon becomes
 * a small plated mark rather than the headline. Hovering raises the plate and
 * brightens its top light-catch — the only motion, since the band is passed on
 * the way to something else.
 */
export function FeatureBand({
  items,
  className,
}: {
  items: { icon: React.ReactNode; title: string; detail: string }[];
  className?: string;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'grid gap-px overflow-hidden border-y border-border-subtle bg-border-subtle',
        'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
        className,
      )}
    >
      {items.map((item, index) => (
        <div
          key={item.title}
          className={cn(
            'plate plate-lit group relative flex flex-col p-6 pt-7 xl:p-7 xl:pt-8',
            'transition-[background-color,transform] duration-300 ease-out-expo',
            'hover:z-10 hover:bg-[#111111] lg:hover:-translate-y-0.5',
            '[&::before]:opacity-60 [&::before]:transition-opacity [&::before]:duration-300',
            'hover:[&::before]:opacity-100',
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <span
              className={cn(
                'grid h-8 w-8 place-items-center rounded-lg border border-border-strong',
                'bg-surface text-muted-foreground transition-colors duration-300',
                'group-hover:border-border-strong group-hover:text-foreground',
                '[&_svg]:h-[15px] [&_svg]:w-[15px]',
              )}
            >
              {item.icon}
            </span>
            <span
              className="font-mono text-[0.5625rem] tracking-[0.14em] text-subtle"
              aria-hidden
            >
              {String(index + 1).padStart(2, '0')}
            </span>
          </div>

          <p className="mt-9 font-display text-[1.0625rem] font-medium leading-snug tracking-[-0.03em] text-foreground">
            {item.title}
          </p>
          <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
            {item.detail}
          </p>
        </div>
      ))}
    </div>
  );
}

/**
 * A miniature of a real GRID-X surface, used inside stage panels. Static and
 * hand-built rather than a screenshot, so it stays sharp, themable and
 * weighs nothing.
 */
export function MiniSurface({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn('overflow-hidden rounded-control bg-card shadow-hairline', className)}>
      <div className="flex items-center gap-1.5 border-b border-border-subtle px-3 py-2">
        <span className="h-1.5 w-1.5 rounded-full bg-surface-active" aria-hidden />
        <span className="h-1.5 w-1.5 rounded-full bg-surface-active" aria-hidden />
        <span className="ml-1.5 font-mono text-[10px] uppercase tracking-[0.06em] text-subtle">
          {title}
        </span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

/** A single row inside a MiniSurface. */
export function MiniRow({
  label,
  meta,
  tone = 'default',
}: {
  label: string;
  meta: string;
  tone?: 'default' | 'success' | 'warning' | 'destructive';
}): React.JSX.Element {
  const dot =
    tone === 'success'
      ? 'bg-success'
      : tone === 'warning'
        ? 'bg-warning'
        : tone === 'destructive'
          ? 'bg-destructive'
          : 'bg-muted-foreground';

  return (
    <div className="flex items-center gap-2 border-b border-border-subtle py-1.5 last:border-b-0">
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dot)} aria-hidden />
      <span className="min-w-0 flex-1 truncate text-[11px] text-foreground">{label}</span>
      <span className="shrink-0 font-mono text-[10px] tabular-nums text-subtle">{meta}</span>
    </div>
  );
}
