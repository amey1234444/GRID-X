import Link from 'next/link';

import { DataTable, type Column } from '@/components/app/data-table';
import { EmptyState } from '@/components/app/empty-state';
import { PageHeader } from '@/components/app/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate, formatDateTime, formatNumber } from '@/lib/format';
import { readParam, type SearchParams } from '@/lib/query';
import { partnerOptions } from '@/lib/reference';
import { apiGet } from '@/lib/session';
import type { ReportColumn, ReportDefinition, ReportResult } from '@/lib/types';
import { ReportFilterBar } from './report-filters';

export const metadata = { title: 'Reports · GRID-X' };

type ReportCell = string | number | null;

function renderCell(column: ReportColumn, value: ReportCell): React.ReactNode {
  if (value === null || value === '') return '—';
  switch (column.type) {
    case 'currency':
      return formatCurrency(Number(value));
    case 'number':
      return formatNumber(Number(value));
    case 'percent':
      return `${formatNumber(Number(value))}%`;
    case 'date':
      return formatDate(String(value));
    default:
      return String(value);
  }
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const selected = readParam(searchParams, 'key');
  const partnerId = readParam(searchParams, 'partnerId');
  const from = readParam(searchParams, 'from');
  const to = readParam(searchParams, 'to');

  const filterQuery = new URLSearchParams();
  if (partnerId) filterQuery.set('partnerId', partnerId);
  if (from) filterQuery.set('from', from);
  if (to) filterQuery.set('to', to);
  const suffix = filterQuery.toString() ? `?${filterQuery.toString()}` : '';

  const [catalogue, partners] = await Promise.all([
    apiGet<ReportDefinition[]>('/reports', []),
    partnerOptions(),
  ]);

  const result = selected
    ? await apiGet<ReportResult | null>(`/reports/${selected}${suffix}`, null)
    : null;

  const columns: Column<Record<string, ReportCell>>[] = (result?.columns ?? []).map((column) => ({
    key: column.key,
    header: column.label,
    align: column.type === 'number' || column.type === 'currency' || column.type === 'percent' ? 'right' : 'left',
    render: (row) => renderCell(column, row[column.key] ?? null),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="The full Section 21 report catalogue. Every report respects partner scoping and can be exported to CSV."
      />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Catalogue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {catalogue.map((definition) => {
              const params = new URLSearchParams(filterQuery.toString());
              params.set('key', definition.key);
              const active = definition.key === selected;
              return (
                <Link
                  key={definition.key}
                  href={`/app/reports?${params.toString()}`}
                  className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                    active ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
                  }`}
                >
                  {definition.title}
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <ReportFilterBar partners={partners} />

          {result === null ? (
            <EmptyState
              title={selected ? 'Report unavailable' : 'Pick a report'}
              description={
                selected
                  ? 'The API could not build this report with the current filters.'
                  : 'Choose one of the reports on the left to run it against live data.'
              }
            />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">{result.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {formatNumber(result.rows.length)} rows · generated {formatDateTime(result.generatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-normal">
                    {result.key}
                  </Badge>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/api/reports/${result.key}/export${suffix}`} prefetch={false}>
                      Export CSV
                    </Link>
                  </Button>
                </div>
              </div>
              <DataTable
                columns={columns}
                rows={result.rows}
                empty={{ title: 'No data for these filters', description: 'Widen the period or clear the partner filter.' }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
