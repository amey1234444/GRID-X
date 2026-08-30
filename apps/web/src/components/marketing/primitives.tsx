import { cn } from '@/lib/utils';

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
        'text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted-foreground shadow-hairline',
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
}: {
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <section
      className={cn(
        'relative overflow-hidden border-y border-border-subtle bg-[hsl(240_8%_3%)] py-28 sm:py-36',
        className,
      )}
    >
      {/* Horizon arc — the only decorative flourish on the page. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 h-[42rem] rounded-[100%] bg-gradient-to-b from-foreground/[0.12] via-transparent to-transparent blur-3xl"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 grid-pattern radial-fade opacity-30" aria-hidden />
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
          <p className="text-[1.75rem] font-semibold leading-none tracking-[-0.03em]" data-numeric>
            {item.value}
          </p>
          <p className="mt-2 text-[0.8125rem] leading-snug text-muted-foreground">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * Feature row — five short claims across a single band, as a rhythm break
 * between the long scrolling sections.
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
      {items.map((item) => (
        <div key={item.title} className="bg-background p-6">
          <span className="inline-flex text-muted-foreground [&_svg]:h-[18px] [&_svg]:w-[18px]">
            {item.icon}
          </span>
          <p className="mt-4 text-[0.9375rem] font-medium leading-snug">{item.title}</p>
          <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted-foreground">{item.detail}</p>
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
    <div className={cn('overflow-hidden rounded-input bg-card shadow-hairline', className)}>
      <div className="flex items-center gap-1.5 border-b border-border-subtle px-3 py-2">
        <span className="h-1.5 w-1.5 rounded-full bg-surface-active" aria-hidden />
        <span className="h-1.5 w-1.5 rounded-full bg-surface-active" aria-hidden />
        <span className="ml-1.5 text-[11px] text-subtle">{title}</span>
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
      <span className="shrink-0 text-[11px] tabular-nums text-subtle">{meta}</span>
    </div>
  );
}
