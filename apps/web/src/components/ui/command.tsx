'use client';

import * as React from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import { Search } from 'lucide-react';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn('flex h-full w-full flex-col overflow-hidden bg-popover text-popover-foreground', className)}
    {...props}
  />
));
Command.displayName = CommandPrimitive.displayName;

function CommandDialog({
  children,
  className,
  ...props
}: React.ComponentProps<typeof Dialog> & { className?: string }): React.JSX.Element {
  return (
    <Dialog {...props}>
      <DialogContent
        hideClose
        className={cn(
          'overflow-hidden border-border-subtle bg-popover p-0 shadow-popover sm:max-w-[620px]',
          className,
        )}
      >
        <Command
          className={cn(
            '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5',
            '[&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium',
            '[&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em]',
            '[&_[cmdk-group-heading]]:text-subtle',
            '[&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-2',
            '[&_[cmdk-input-wrapper]_svg]:h-4 [&_[cmdk-input-wrapper]_svg]:w-4',
            '[&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2',
            '[&_[cmdk-item]_svg]:h-4 [&_[cmdk-item]_svg]:w-4',
          )}
        >
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
}

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className="flex items-center gap-2.5 border-b border-border-subtle px-4" cmdk-input-wrapper="">
    <Search className="h-4 w-4 shrink-0 text-subtle" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        'flex h-12 w-full bg-transparent text-sm outline-none placeholder:text-subtle disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  </div>
));
CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn('max-h-[380px] overflow-y-auto overflow-x-hidden py-2', className)}
    {...props}
  />
));
CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty ref={ref} className="py-10 text-center text-sm text-subtle" {...props} />
));
CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group ref={ref} className={cn('overflow-hidden text-foreground', className)} {...props} />
));
CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator ref={ref} className={cn('my-1 h-px bg-border-subtle', className)} {...props} />
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center gap-2.5 rounded-input text-sm outline-none',
      'text-muted-foreground transition-colors duration-100',
      'data-[selected=true]:bg-surface-hover data-[selected=true]:text-foreground',
      'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
      className,
    )}
    {...props}
  />
));
CommandItem.displayName = CommandPrimitive.Item.displayName;

function CommandShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>): React.JSX.Element {
  return <span className={cn('ml-auto text-[11px] tracking-widest text-subtle', className)} {...props} />;
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};
