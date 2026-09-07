import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-surface-hover',
        'after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer after:bg-gradient-to-r after:from-transparent after:via-white/[0.06] after:to-transparent',
        className,
      )}
      {...props}
    />
  );
}
