import {
  extractText,
  formatAggregate,
  inferColumnType,
  parseNumeric,
  sumColumn,
  type ColumnType,
} from '@/components/app/column-intel';
import { DataGrid, type GridHeader, type GridRow } from '@/components/app/data-grid';
import { EmptyState } from '@/components/app/empty-state';
import type { TableDensity } from '@/components/ui/table';

export type { ColumnType };

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
  align?: 'left' | 'right';
  /** Omit to let the column's name decide — see `inferColumnType`. */
  type?: ColumnType;
  /** Overrides the sort key derived from the rendered text. */
  sortValue?: (row: T) => string | number | null | undefined;
  /** Overrides the footer aggregate. Return null to suppress it. */
  footer?: (rows: T[]) => React.ReactNode;
}

/**
 * The data table — a **Server Component** by design.
 *
 * Column definitions carry `render` callbacks, and functions cannot be passed
 * across the RSC boundary into a Client Component. So every callback is
 * invoked here, on the server: cells become React elements, sort keys become
 * strings and numbers, aggregates become text. Only that serialisable result
 * is handed to `DataGrid`, which owns sorting, density and selection.
 *
 * Keeping this component on the server is what lets ~44 pages carry on
 * declaring `{ key, header, render }` with no ceremony.
 */
export function DataTable<T>({
  columns,
  rows,
  rowHref,
  empty,
  caption,
  selectable = false,
  density = 'comfortable',
  rowKey,
  aggregates = true,
}: {
  columns: Column<T>[];
  rows: T[];
  rowHref?: (row: T) => string;
  empty?: { title: string; description?: string; action?: React.ReactNode };
  caption?: string;
  selectable?: boolean;
  density?: TableDensity;
  rowKey?: (row: T, index: number) => string;
  /** Set false where a column sum would be nonsense (rates, scores, IDs). */
  aggregates?: boolean;
}): React.JSX.Element {
  if (rows.length === 0) {
    return (
      <EmptyState
        title={empty?.title ?? 'Nothing to show yet'}
        description={empty?.description ?? 'Records will appear here once they are created.'}
        action={empty?.action}
      />
    );
  }

  const resolved = columns.map((column) => ({
    column,
    type: column.type ?? inferColumnType(column.key, column.header),
  }));

  const headers: GridHeader[] = resolved.map(({ column, type }) => ({
    key: column.key,
    label: column.header,
    type,
    align: column.align ?? 'left',
    className: column.className,
    sortable: true,
  }));

  const gridRows: GridRow[] = rows.map((row, rowIndex) => {
    const cells: React.ReactNode[] = [];
    const sortKeys: (string | number | null)[] = [];

    for (const { column, type } of resolved) {
      const cell = column.render(row);
      cells.push(cell);

      if (column.sortValue) {
        sortKeys.push(column.sortValue(row) ?? null);
        continue;
      }
      // Flatten the rendered cell so JSX columns still sort sensibly.
      const text = extractText(cell).trim();
      if (!text) sortKeys.push(null);
      else sortKeys.push(type === 'number' ? parseNumeric(text) : text.toLowerCase());
    }

    return {
      key: rowKey?.(row, rowIndex) ?? String(rowIndex),
      href: rowHref?.(row),
      cells,
      sortKeys,
    };
  });

  const footerCells: React.ReactNode[] = resolved.map(({ column, type }) => {
    if (column.footer) return column.footer(rows);
    if (!aggregates || type !== 'number') return null;
    const total = sumColumn(rows, column.render);
    return total === null ? null : (
      <span title={`Sum of ${column.header}`}>{formatAggregate(total)}</span>
    );
  });

  const hasAggregate = footerCells.some((cell) => cell !== null);

  return (
    <DataGrid
      headers={headers}
      rows={gridRows}
      footerCells={hasAggregate ? footerCells : null}
      density={density}
      caption={caption}
      selectable={selectable}
    />
  );
}
