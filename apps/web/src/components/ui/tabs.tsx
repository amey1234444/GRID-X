'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

/**
 * Two shapes, one component:
 *   `underline` (default) — record/detail sections. Reads as navigation.
 *   `segmented`           — a control that switches one view's mode.
 */
type TabsVariant = 'underline' | 'segmented';

const VariantContext = React.createContext<TabsVariant>('underline');

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & { variant?: TabsVariant }
>(({ className, variant = 'underline', ...props }, ref) => (
  <VariantContext.Provider value={variant}>
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        variant === 'underline'
          ? 'inline-flex h-9 items-center gap-4 border-b border-border-subtle text-muted-foreground'
          : 'inline-flex h-8 items-center gap-0.5 rounded-input bg-surface-elevated p-0.5 text-muted-foreground shadow-hairline',
        className,
      )}
      {...props}
    />
  </VariantContext.Provider>
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  const variant = React.useContext(VariantContext);
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-[0.8125rem] font-medium',
        'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70',
        'disabled:pointer-events-none disabled:opacity-50',
        '[&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:opacity-60',
        variant === 'underline'
          ? [
              // The -1px bottom keeps the active rule flush with the list border.
              'relative h-9 px-0.5 pb-2 pt-1',
              'after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:rounded-full',
              'after:scale-x-0 after:bg-primary after:transition-transform after:duration-200 after:ease-out-expo',
              'hover:text-foreground',
              'data-[state=active]:text-foreground data-[state=active]:after:scale-x-100',
            ]
          : [
              'h-7 rounded-control px-2.5',
              'hover:text-foreground',
              'data-[state=active]:bg-surface-active data-[state=active]:text-foreground',
            ],
        className,
      )}
      {...props}
    />
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-4 focus-visible:outline-none',
      'data-[state=active]:duration-200 data-[state=active]:animate-in data-[state=active]:fade-in-0',
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
