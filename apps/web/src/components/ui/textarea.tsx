import * as React from 'react';

import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[76px] w-full resize-y rounded-input bg-surface-elevated px-3 py-2 text-[0.8125rem] leading-relaxed',
        'shadow-hairline transition-[box-shadow,background-color] duration-150',
        'placeholder:text-subtle hover:bg-surface-hover',
        'focus-visible:bg-surface-elevated focus-visible:outline-none',
        'focus-visible:shadow-[inset_0_0_0_1px_hsl(var(--primary)),0_0_0_3px_hsl(var(--primary)/0.15)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

export { Textarea };
