import Link from 'next/link';

import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={cn('h-5 w-5', className)} aria-hidden>
      <circle cx="16" cy="16" r="13" fill="currentColor" />
      <path
        d="M6.8 8.1 23.9 25.2M4.4 12.7l14.9 14.9M12.7 4.4l14.9 14.9"
        stroke="#090909"
        strokeWidth="2.35"
      />
      <path
        d="m19.6 8.1 4.3 4.3-4.3 4.3"
        stroke="hsl(var(--brand))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
      className={cn('inline-flex h-9 w-9 items-center justify-center text-foreground', className)}
      aria-hidden
    >
      <LogoMark className={cn('h-7 w-7', markClassName)} />
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
    <Link href={href} className={cn('group flex items-center gap-2.5', className)}>
      <Logo />
      <span className="min-w-0">
        <span className="block font-display text-[1.0625rem] font-semibold leading-none tracking-[-0.04em]">
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
