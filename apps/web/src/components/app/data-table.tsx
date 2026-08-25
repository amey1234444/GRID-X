'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlignLeft,
  ArrowDown,
  ArrowUp,
  Calendar,
  ChevronsUpDown,
  CircleDot,
  Hash,
  Link2,
  MapPin,
  Rows2,
  Rows3,
  User,
  type LucideIcon,
} from 'lucide-react';

import { EmptyState } from '@/components/app/empty-state';
import { ToolbarChip } from '@/components/app/toolbar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  type TableDensity,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * Column "type" drives the small glyph in the header. It is the cheapest
 * way to make a dense grid legible: you learn a column's shape before you
 * read its name.
 */
export type ColumnType = 'text' | 'number' | 'date' | 'status' | 'person' | 'location' | 'link';

const TYPE_ICON: Record<ColumnType, LucideIcon> = {
  text: AlignLeft,
  number: Hash,
  date: Calendar,
  status: CircleDot,
  person: User,
  location: MapPin,
  link: Link2,
};

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
  align?: 'left' | 'right';
  type?: ColumnType;
  /** Sorts client-side on the current page when provided. */
  sortValue?: (row: T) => string | number | null | undefined;
  /** Renders an aggregate in the footer rail, mirroring the column. */
  footer?: (rows: T[]) => React.ReactNode;
}

type SortState = { key: string; direction: 'asc' | 'desc' } | null;

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

export function DataTable<T>({
  columns,
  rows,
  rowHref,
  empty,
  caption,
  selectable = false,
  density: densityProp,
  onSelectionChange,
  selectionActions,
  rowKey,
}: {
  columns: Column<T>[];
  rows: T[];
  rowHref?: (row: T) => string;
  empty?: { title: string; description?: string; action?: React.ReactNode };
  caption?: string;
  /** Adds the leading checkbox column and the selection action bar. */
  selectable?: boolean;
  density?: TableDensity;
  onSelectionChange?: (rows: T[]) => void;
  /** Rendered in the bar that replaces the footer while rows are selected. */
  selectionActions?: (rows: T[]) => React.ReactNode;
  rowKey?: (row: T, index: number) => string;
}): React.JSX.Element {
  const [density, setDensity] = React.useState<TableDensity>(densityProp ?? 'comfortable');
  const [sort, setSort] = React.useState<SortState>(null);
  const [selected, setSelected] = React.useState<Set<number>>(new Set());

  // Row identity is positional, so any change to the underlying page must
  // drop the selection rather than silently re-point it at different rows.
  React.useEffect(() => {
    setSelected(new Set());
  }, [rows]);

  const sorted = React.useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((item) => item.key === sort.key);
    if (!column?.sortValue) return rows;
    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => factor * compare(column.sortValue?.(a), column.sortValue?.(b)));
  }, [rows, sort, columns]);

  const selectedRows = React.useMemo(
    () => [...selected].map((index) => sorted[index]).filter((row): row is T => row !== undefined),
    [selected, sorted],
  );

  React.useEffect(() => {
    onSelectionChange?.(selectedRows);
  }, [selectedRows, onSelectionChange]);

  const toggleRow = (index: number): void => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const allSelected = sorted.length > 0 && selected.size === sorted.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = (): void => {
    setSelected(allSelected ? new Set() : new Set(sorted.map((_, index) => index)));
  };

  const toggleSort = (column: Column<T>): void => {
    if (!column.sortValue) return;
    setSort((current) => {
      if (current?.key !== column.key) return { key: column.key, direction: 'asc' };
      if (current.direction === 'asc') return { key: column.key, direction: 'desc' };
      return null;
    });
  };

  if (rows.length === 0) {
    return (
      <EmptyState
        title={empty?.title ?? 'Nothing to show yet'}
        description={empty?.description ?? 'Records will appear here once they are created.'}
        action={empty?.action}
      />
    );
  }

  const hasFooter = columns.some((column) => column.footer);
  const showSelectionBar = selectable && selected.size > 0;

  return (
    <div className="overflow-hidden rounded-card bg-card shadow-hairline">
      <Table density={density} containerClassName="max-h-[calc(100vh-19rem)]">
        <TableHeader>
          <TableRow className="[&>td]:border-b-0">
            {selectable ? (
              <TableHead className="w-10 px-0">
                <div className="flex items-center justify-center">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                    onCheckedChange={toggleAll}
                    aria-label="Select all rows on this page"
                  />
                </div>
              </TableHead>
            ) : null}
            {columns.map((column) => {
              const Icon = TYPE_ICON[column.type ?? 'text'];
              const isSorted = sort?.key === column.key;
              const sortable = Boolean(column.sortValue);
              return (
                <TableHead
                  key={column.key}
                  aria-sort={isSorted ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className={cn(column.className)}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(column)}
                    disabled={!sortable}
                    className={cn(
                      'group/head -mx-1 flex w-[calc(100%+0.5rem)] items-center gap-1.5 rounded-control px-1 py-1',
                      'text-left transition-colors duration-100',
                      column.align === 'right' && 'flex-row-reverse text-right',
                      sortable ? 'hover:bg-surface-hover hover:text-foreground' : 'cursor-default',
                      isSorted && 'text-foreground',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 opacity-45" />
                    <span className="truncate">{column.header}</span>
                    {sortable ? (
                      <span className="ml-auto shrink-0">
                        {isSorted ? (
                          sort.direction === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-0 transition-opacity group-hover/head:opacity-40" />
                        )}
                      </span>
                    ) : null}
                  </button>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>

        <TableBody>
          {sorted.map((row, index) => {
            const href = rowHref?.(row);
            const isSelected = selected.has(index);
            return (
              <TableRow
                key={rowKey?.(row, index) ?? index}
                interactive={Boolean(href)}
                data-state={isSelected ? 'selected' : undefined}
              >
                {selectable ? (
                  <TableCell className="w-10 px-0">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleRow(index)}
                        aria-label="Select row"
                        className={cn(
                          // Opacity reveal keeps the grid calm until you reach for it.
                          'transition-opacity duration-100',
                          !isSelected && 'opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100',
                        )}
                      />
                    </div>
                  </TableCell>
                ) : null}
                {columns.map((column, columnIndex) => (
                  <TableCell
                    key={column.key}
                    className={cn(
                      column.align === 'right' && 'text-right',
                      column.type === 'number' && 'tabular-nums',
                      column.className,
                    )}
                  >
                    {href && columnIndex === 0 ? (
                      // The whole row is hoverable, but only the primary cell
                      // carries the link so text stays selectable elsewhere.
                      <Link
                        href={href}
                        className="-mx-1 block truncate rounded-control px-1 font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
                      >
                        {column.render(row)}
                      </Link>
                    ) : (
                      column.render(row)
                    )}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>

        {hasFooter && !showSelectionBar ? (
          <TableFooter className="sticky bottom-0 z-10 [&_td]:bg-surface-elevated">
            <TableRow className="[&>td]:border-b-0">
              {selectable ? <TableCell className="w-10 px-0" /> : null}
              {columns.map((column, index) => (
                <TableCell
                  key={column.key}
                  className={cn(
                    'text-[0.75rem] text-subtle',
                    column.align === 'right' && 'text-right tabular-nums',
                  )}
                >
                  {column.footer
                    ? column.footer(sorted)
                    : index === 0
                      ? `${sorted.length} ${sorted.length === 1 ? 'record' : 'records'}`
                      : null}
                </TableCell>
              ))}
            </TableRow>
          </TableFooter>
        ) : null}
      </Table>

      {showSelectionBar ? (
        <div className="flex items-center gap-3 border-t border-border-subtle bg-primary/[0.06] px-3 py-2 duration-200 animate-in fade-in-0 slide-in-from-bottom-1">
          <span className="text-[0.8125rem] font-medium text-foreground">{selected.size} selected</span>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-[0.8125rem] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Clear
          </button>
          <div className="ml-auto flex items-center gap-2">{selectionActions?.(selectedRows)}</div>
        </div>
      ) : (
        <div className="flex items-center gap-2 border-t border-border-subtle px-3 py-1.5">
          <span className="text-[0.75rem] text-subtle">
            {sorted.length} {sorted.length === 1 ? 'record' : 'records'}
            {caption ? <span className="ml-2 text-subtle">· {caption}</span> : null}
          </span>
          <div className="ml-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <ToolbarChip
                  tone="ghost"
                  icon={density === 'compact' ? Rows3 : Rows2}
                  onClick={() => setDensity((value) => (value === 'compact' ? 'comfortable' : 'compact'))}
                  aria-label="Toggle row density"
                  className="h-7"
                />
              </TooltipTrigger>
              <TooltipContent>{density === 'compact' ? 'Comfortable rows' : 'Compact rows'}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}
    </div>
  );
}
