import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

const alertVariants = cva(
  'flex items-start gap-2.5 rounded-input px-3 py-2.5 text-[0.8125rem] leading-snug',
  {
    variants: {
      variant: {
        info: 'bg-info/[0.08] text-info shadow-[inset_0_0_0_1px_hsl(var(--info)/0.22)]',
        success: 'bg-success/[0.08] text-success shadow-[inset_0_0_0_1px_hsl(var(--success)/0.22)]',
        warning: 'bg-warning/[0.08] text-warning shadow-[inset_0_0_0_1px_hsl(var(--warning)/0.22)]',
        destructive:
          'bg-destructive/[0.08] text-destructive shadow-[inset_0_0_0_1px_hsl(var(--destructive)/0.22)]',
      },
    },
    defaultVariants: { variant: 'info' },
  },
);

const ICONS: Record<NonNullable<VariantProps<typeof alertVariants>['variant']>, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  destructive: AlertCircle,
};

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  /** Suppresses the leading glyph for inline, space-constrained placements. */
  hideIcon?: boolean;
}

/**
 * Inline feedback. Tinted wash + hairline, matching the badge system, so a
 * form error reads as the same language as a status pill.
 */
export function Alert({
  className,
  variant = 'info',
  hideIcon = false,
  children,
  ...props
}: AlertProps): React.JSX.Element {
  const Icon = ICONS[variant ?? 'info'];
  return (
    <div
      role={variant === 'destructive' ? 'alert' : 'status'}
      className={cn(alertVariants({ variant }), 'duration-200 animate-in fade-in-0 slide-in-from-top-1', className)}
      {...props}
    >
      {hideIcon ? null : <Icon className="mt-px h-4 w-4 shrink-0" />}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function AlertTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>): React.JSX.Element {
  return <p className={cn('font-medium', className)} {...props} />;
}

export function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>): React.JSX.Element {
  return <p className={cn('mt-0.5 opacity-85', className)} {...props} />;
}

export { alertVariants };
