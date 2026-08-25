import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Status pills use a tinted wash + matching hairline rather than a solid
 * fill, so a dense table of statuses reads as data instead of confetti.
 */
const badgeVariants = cva(
  [
    'inline-flex items-center gap-1.5 rounded-control px-1.5 py-0.5',
    'text-[0.6875rem] font-medium leading-[1.4] tracking-[-0.005em] whitespace-nowrap',
    'transition-colors duration-200',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.2)]',
        secondary: 'bg-surface-hover text-secondary-foreground shadow-[inset_0_0_0_1px_hsl(var(--border))]',
        outline: 'text-muted-foreground shadow-[inset_0_0_0_1px_hsl(var(--border))]',
        success: 'bg-success/10 text-success shadow-[inset_0_0_0_1px_hsl(var(--success)/0.22)]',
        warning: 'bg-warning/10 text-warning shadow-[inset_0_0_0_1px_hsl(var(--warning)/0.22)]',
        destructive: 'bg-destructive/10 text-destructive shadow-[inset_0_0_0_1px_hsl(var(--destructive)/0.22)]',
        info: 'bg-info/10 text-info shadow-[inset_0_0_0_1px_hsl(var(--info)/0.22)]',
        muted: 'bg-surface-hover text-muted-foreground',
      },
      size: {
        default: '',
        sm: 'px-1 py-0 text-[10px]',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  /** Leading state dot — reads faster than colour alone in a dense grid. */
  dot?: boolean;
}

function Badge({ className, variant, size, dot = false, children, ...props }: BadgeProps): React.JSX.Element {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
