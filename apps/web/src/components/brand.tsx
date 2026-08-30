import Link from 'next/link';

import { cn } from '@/lib/utils';

const LIT: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [2, 0],
  [1, 1],
  [0, 2],
  [2, 2],
];

const CELLS: ReadonlyArray<readonly [number, number]> = [0, 1, 2].flatMap((x) =>
  [0, 1, 2].map((y) => [x, y] as const),
);

/*
 * A 3x3 lattice — the grid — whose diagonal nodes are lit, so the grid itself
 * spells the X. Monochrome and geometric: it has to survive 16px in a browser
 * tab, a launcher icon and a stamped metal tag.
 */
export function LogoMark({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={cn('h-4 w-4', className)} aria-hidden>
      {CELLS.map(([x, y]) => {
        const lit = LIT.some(([lx, ly]) => lx === x && ly === y);
        return (
          <rect
            key={`${x}-${y}`}
            x={1 + x * 8}
            y={1 + y * 8}
            width={6}
            height={6}
            rx={1.7}
            fillOpacity={lit ? 1 : 0.2}
          />
        );
      })}
    </svg>
  );
}

export function Logo({ className }: { className?: string }): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-[9px] bg-surface-elevated text-foreground',
        'shadow-[inset_0_0_0_1px_hsl(var(--border-strong)),0_1px_2px_0_hsl(0_0%_0%/0.5)]',
        className,
      )}
      aria-hidden
    >
      <LogoMark className="h-[17px] w-[17px]" />
    </span>
  );
}

export function Wordmark({ href = '/', className }: { href?: string; className?: string }): React.JSX.Element {
  return (
    <Link href={href} className={cn('flex items-center gap-2.5', className)}>
      <Logo />
      <span className="text-[15px] font-semibold tracking-tight">
        GRID<span className="text-muted-foreground">-X</span>
      </span>
    </Link>
  );
}
