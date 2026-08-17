import Link from 'next/link';

import { EmptyState } from '@/components/app/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
  align?: 'left' | 'right';
}

export function DataTable<T>({
  columns,
  rows,
  rowHref,
  empty,
  caption,
}: {
  columns: Column<T>[];
  rows: T[];
  rowHref?: (row: T) => string;
  empty?: { title: string; description?: string };
  caption?: string;
}): React.JSX.Element {
  if (rows.length === 0) {
    return (
      <EmptyState
        title={empty?.title ?? 'Nothing to show yet'}
        description={empty?.description ?? 'Records will appear here once they are created.'}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/50 hover:bg-secondary/50">
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(column.align === 'right' && 'text-right', column.className)}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => {
            const href = rowHref?.(row);
            return (
              <TableRow key={index}>
                {columns.map((column, columnIndex) => (
                  <TableCell
                    key={column.key}
                    className={cn(column.align === 'right' && 'text-right', column.className)}
                  >
                    {href && columnIndex === 0 ? (
                      <Link href={href} className="font-medium text-primary hover:underline">
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
      </Table>
      {caption ? <p className="border-t px-4 py-2.5 text-xs text-muted-foreground">{caption}</p> : null}
    </div>
  );
}
