import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-input',
    'text-[0.8125rem] font-medium leading-none tracking-[-0.005em]',
    'transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out-expo',
    'active:scale-[0.985]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-45',
    '[&_svg]:size-4 [&_svg]:shrink-0',
  ].join(' '),
  {
    variants: {
      variant: {
        // Solid brand action. One per view — everything else is quieter.
        default:
          'bg-primary text-primary-foreground shadow-[0_1px_2px_rgb(0_0_0/0.4),inset_0_1px_0_hsl(0_0%_100%/0.12)] hover:bg-primary-hover',
        destructive:
          'bg-destructive text-destructive-foreground shadow-[0_1px_2px_rgb(0_0_0/0.4)] hover:bg-destructive/90',
        success: 'bg-success text-success-foreground shadow-[0_1px_2px_rgb(0_0_0/0.4)] hover:bg-success/90',
        // The workhorse in a dense dark UI: a surface, not an outline.
        outline:
          'bg-surface-elevated text-foreground shadow-hairline hover:bg-surface-hover hover:shadow-[inset_0_0_0_1px_hsl(var(--border-strong))]',
        secondary: 'bg-surface-hover text-secondary-foreground hover:bg-surface-active',
        ghost: 'text-muted-foreground hover:bg-surface-hover hover:text-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-3.5',
        sm: 'h-8 rounded-control px-2.5 text-xs',
        xs: 'h-7 rounded-control px-2 text-xs [&_svg]:size-3.5',
        lg: 'h-11 rounded-lg px-6 text-sm',
        icon: 'h-9 w-9',
        'icon-sm': 'h-8 w-8 rounded-control [&_svg]:size-4',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
