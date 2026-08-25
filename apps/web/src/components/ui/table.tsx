'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Density is set once on <Table> and read by cells through context, so a
 * single toolbar toggle re-flows the whole grid without prop drilling.
 */
export type TableDensity = 'compact' | 'comfortable';

const DensityContext = React.createContext<TableDensity>('comfortable');
export const useTableDensity = (): TableDensity => React.useContext(DensityContext);

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement> & { density?: TableDensity; containerClassName?: string }
>(({ className, density = 'comfortable', containerClassName, ...props }, ref) => (
  <DensityContext.Provider value={density}>
    <div className={cn('relative w-full overflow-auto', containerClassName)}>
      <table
        ref={ref}
        className={cn('w-full caption-bottom border-separate border-spacing-0 text-sm', className)}
        {...props}
      />
    </div>
  </DensityContext.Provider>
));
Table.displayName = 'Table';

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement> & { sticky?: boolean }
>(({ className, sticky = true, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(sticky && 'sticky top-0 z-10 [&_th]:bg-surface-elevated', className)}
    {...props}
  />
));
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => <tbody ref={ref} className={className} {...props} />);
TableBody.displayName = 'TableBody';

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot ref={ref} className={cn('[&_td]:border-t [&_td]:border-border-subtle', className)} {...props} />
));
TableFooter.displayName = 'TableFooter';

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }
>(({ className, interactive = false, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'group/row transition-colors duration-100',
      '[&>td]:border-b [&>td]:border-border-subtle',
      interactive && 'cursor-pointer hover:bg-surface-hover/60',
      'data-[state=selected]:bg-primary/[0.07]',
      className,
    )}
    {...props}
  />
));
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => {
  const density = useTableDensity();
  return (
    <th
      ref={ref}
      className={cn(
        'border-b border-border-subtle text-left align-middle',
        'text-[0.8125rem] font-normal text-muted-foreground',
        // Column separators are what make a dense grid readable — hairline only.
        'border-r last:border-r-0',
        density === 'compact' ? 'h-8 px-2.5' : 'h-10 px-3',
        className,
      )}
      {...props}
    />
  );
});
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => {
  const density = useTableDensity();
  return (
    <td
      ref={ref}
      className={cn(
        'align-middle border-r border-border-subtle last:border-r-0',
        density === 'compact' ? 'h-8 px-2.5 py-0' : 'h-11 px-3 py-0',
        className,
      )}
      {...props}
    />
  );
});
TableCell.displayName = 'TableCell';

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn('mt-4 text-sm text-muted-foreground', className)} {...props} />
));
TableCaption.displayName = 'TableCaption';

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
