import Link from 'next/link';

import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={cn('h-5 w-5', className)} aria-hidden>
      <path d="M6 6h20v20H6z" stroke="currentColor" strokeOpacity=".28" strokeWidth="1.5" />
      <path d="M6 6l20 20M26 6L6 26" stroke="currentColor" strokeWidth="2.25" />
      <path
        d="M16 4v4M16 24v4M4 16h4M24 16h4"
        stroke="currentColor"
        strokeOpacity=".5"
        strokeWidth="1.5"
      />
      <rect x="3" y="3" width="6" height="6" rx="1" fill="currentColor" />
      <rect x="23" y="3" width="6" height="6" rx="1" fill="currentColor" />
      <rect x="3" y="23" width="6" height="6" rx="1" fill="currentColor" />
      <rect x="23" y="23" width="6" height="6" rx="1" fill="currentColor" />
      <rect x="12.5" y="12.5" width="7" height="7" rx="1.5" fill="hsl(var(--brand))" />
    </svg>
  );
}

export function Logo({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-input bg-[#0b1114] text-foreground',
        'shadow-[inset_0_0_0_1px_hsl(var(--border-strong)),inset_0_1px_0_hsl(0_0%_100%/0.05),0_8px_24px_-14px_hsl(var(--brand)/0.8)]',
        className,
      )}
      aria-hidden
    >
      <LogoMark className={cn('h-6 w-6', markClassName)} />
    </span>
  );
}

export function Wordmark({
  href = '/',
  className,
  compact = false,
}: {
  href?: string;
  className?: string;
  compact?: boolean;
}): React.JSX.Element {
  return (
    <Link href={href} className={cn('group flex items-center gap-3', className)}>
      <Logo />
      <span className="min-w-0">
        <span className="block font-display text-[1.05rem] font-semibold leading-none tracking-[-0.035em]">
          GRID<span className="text-brand">-X</span>
        </span>
        {!compact ? (
          <span className="mt-1 block font-mono text-[0.55rem] uppercase leading-none tracking-[0.14em] text-subtle transition-colors group-hover:text-muted-foreground">
            Manufacturing OS
          </span>
        ) : null}
      </span>
    </Link>
  );
}
