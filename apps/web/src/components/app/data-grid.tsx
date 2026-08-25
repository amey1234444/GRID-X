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

import type { ColumnType } from '@/components/app/column-intel';
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
 * The interactive half of the data table.
 *
 * It receives only serialisable data — pre-rendered cells, pre-computed sort
 * keys and hrefs — because the server half owns every `render` callback. That
 * boundary is deliberate: column definitions contain functions, and functions
 * cannot cross into a Client Component.
 */

const TYPE_ICON: Record<ColumnType, LucideIcon> = {
  text: AlignLeft,
  number: Hash,
  date: Calendar,
  status: CircleDot,
  person: User,
  location: MapPin,
  link: Link2,
};

export interface GridHeader {
  key: string;
  label: string;
  type: ColumnType;
  align: 'left' | 'right';
  className?: string;
  sortable: boolean;
}

export interface GridRow {
  key: string;
  href?: string;
  cells: React.ReactNode[];
  /** One entry per column, aligned with `cells`. */
  sortKeys: (string | number | null)[];
}

type SortState = { index: number; direction: 'asc' | 'desc' } | null;

function compare(a: string | number | null, b: string | number | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

export function DataGrid({
  headers,
  rows,
  footerCells,
  density: densityProp = 'comfortable',
  caption,
  selectable = false,
}: {
  headers: GridHeader[];
  rows: GridRow[];
  /** One entry per column, or null when no column produced an aggregate. */
  footerCells: React.ReactNode[] | null;
  density?: TableDensity;
  caption?: string;
  selectable?: boolean;
}): React.JSX.Element {
  const [density, setDensity] = React.useState<TableDensity>(densityProp);
  const [sort, setSort] = React.useState<SortState>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  // A new page of results must never inherit the previous page's selection.
  const rowSignature = rows.map((row) => row.key).join('|');
  React.useEffect(() => {
    setSelected(new Set());
  }, [rowSignature]);

  const sorted = React.useMemo(() => {
    if (!sort) return rows;
    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort(
      (a, b) => factor * compare(a.sortKeys[sort.index] ?? null, b.sortKeys[sort.index] ?? null),
    );
  }, [rows, sort]);

  const toggleRow = (key: string): void => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allSelected = sorted.length > 0 && selected.size === sorted.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = (): void => {
    setSelected(allSelected ? new Set() : new Set(sorted.map((row) => row.key)));
  };

  const toggleSort = (index: number): void => {
    setSort((current) => {
      if (current?.index !== index) return { index, direction: 'asc' };
      if (current.direction === 'asc') return { index, direction: 'desc' };
      return null;
    });
  };

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
            {headers.map((header, index) => {
              const Icon = TYPE_ICON[header.type];
              const isSorted = sort?.index === index;
              return (
                <TableHead
                  key={header.key}
                  aria-sort={isSorted ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className={header.className}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(index)}
                    disabled={!header.sortable}
                    className={cn(
                      'group/head -mx-1 flex w-[calc(100%+0.5rem)] items-center gap-1.5 rounded-control px-1 py-1',
                      'text-left transition-colors duration-100',
                      header.align === 'right' && 'flex-row-reverse text-right',
                      header.sortable ? 'hover:bg-surface-hover hover:text-foreground' : 'cursor-default',
                      isSorted && 'text-foreground',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 opacity-45" />
                    <span className="truncate">{header.label}</span>
                    {header.sortable ? (
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
          {sorted.map((row) => {
            const isSelected = selected.has(row.key);
            return (
              <TableRow
                key={row.key}
                interactive={Boolean(row.href)}
                data-state={isSelected ? 'selected' : undefined}
              >
                {selectable ? (
                  <TableCell className="w-10 px-0">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleRow(row.key)}
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
                {row.cells.map((cell, index) => {
                  const header = headers[index];
                  return (
                    <TableCell
                      key={header?.key ?? index}
                      className={cn(
                        header?.align === 'right' && 'text-right',
                        header?.type === 'number' && 'tabular-nums',
                        header?.className,
                      )}
                    >
                      {row.href && index === 0 ? (
                        // The row is hoverable, but only the primary cell carries
                        // the link so text stays selectable elsewhere.
                        <Link
                          href={row.href}
                          className="-mx-1 block truncate rounded-control px-1 font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
                        >
                          {cell}
                        </Link>
                      ) : (
                        cell
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>

        {footerCells && !showSelectionBar ? (
          <TableFooter className="sticky bottom-0 z-10 [&_td]:bg-surface-elevated">
            <TableRow className="[&>td]:border-b-0">
              {selectable ? <TableCell className="w-10 px-0" /> : null}
              {footerCells.map((cell, index) => {
                const header = headers[index];
                return (
                  <TableCell
                    key={header?.key ?? index}
                    className={cn(
                      'text-[0.75rem] text-subtle',
                      header?.align === 'right' && 'text-right tabular-nums',
                    )}
                  >
                    {cell ??
                      (index === 0
                        ? `${sorted.length} ${sorted.length === 1 ? 'record' : 'records'}`
                        : null)}
                  </TableCell>
                );
              })}
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
