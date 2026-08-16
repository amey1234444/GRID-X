import Link from 'next/link';

import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-indigo-400 text-sm font-bold text-primary-foreground shadow-subtle',
        className,
      )}
      aria-hidden
    >
      GX
    </span>
  );
}

export function Wordmark({ href = '/', className }: { href?: string; className?: string }): React.JSX.Element {
  return (
    <Link href={href} className={cn('flex items-center gap-2.5', className)}>
      <Logo />
      <span className="text-[15px] font-semibold tracking-tight">
        GRID<span className="text-primary">-X</span>
      </span>
    </Link>
  );
}
