import * as React from 'react';

import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full rounded-input bg-surface-elevated px-3 text-[0.8125rem] text-foreground',
        'shadow-hairline transition-[box-shadow,background-color] duration-150',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'placeholder:text-subtle',
        'hover:bg-surface-hover',
        // Focus reads as a brand-tinted ring on the field itself, not an offset halo.
        'focus-visible:bg-surface-elevated focus-visible:outline-none',
        'focus-visible:shadow-[inset_0_0_0_1px_hsl(var(--primary)),0_0_0_3px_hsl(var(--primary)/0.15)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-[invalid=true]:shadow-[inset_0_0_0_1px_hsl(var(--destructive))]',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
