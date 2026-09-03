import Link from 'next/link';

import { EmptyState } from '@/components/app/empty-state';
import { PageHeader } from '@/components/app/page-header';
import { PaginationControls } from '@/components/app/pagination-controls';
import { SearchFilters } from '@/components/app/search-filters';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime, formatNumber, humanise } from '@/lib/format';
import { optionsFrom } from '@/lib/options';
import { readPage, readParam, type SearchParams } from '@/lib/query';
import { apiGet } from '@/lib/session';
import { emptyPage, type InspectionRow, type Paginated } from '@/lib/types';

export const metadata = { title: 'Inspection queue · GRID-X Inspector' };

export default async function InspectorQueuePage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const page = readPage(searchParams);
  const query = new URLSearchParams({ page: String(page), pageSize: '20' });
  for (const key of ['search', 'status', 'type']) {
    const value = readParam(searchParams, key);
    if (value) query.set(key, value);
  }

  const inspections = await apiGet<Paginated<InspectionRow>>(
    `/quality/inspections?${query.toString()}`,
    emptyPage<InspectionRow>(),
  );

  const requested = inspections.data.filter((row) => row.status === 'REQUESTED').length;
  const inProgress = inspections.data.filter((row) => row.status === 'IN_PROGRESS').length;
  const firstArticles = inspections.data.filter((row) => row.type === 'FIRST_ARTICLE').length;

  return (
    <div className="space-y-5">
      <PageHeader
        icon="ClipboardCheck"
        title="Inspection queue"
        description="Batches offered by partners, waiting for first article, in-process or final inspection."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Queued" value={formatNumber(inspections.total)} />
        <StatCard label="Awaiting start" value={formatNumber(requested)} tone={requested > 0 ? 'warning' : 'default'} />
        <StatCard label="In progress" value={formatNumber(inProgress)} />
        <StatCard label="First articles" value={formatNumber(firstArticles)} />
      </div>

      <SearchFilters
        searchPlaceholder="Search inspection, job or partner…"
        filters={[
          {
            name: 'status',
            label: 'Status',
            options: optionsFrom(['REQUESTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED']),
          },
          { name: 'type', label: 'Type', options: optionsFrom(['FIRST_ARTICLE', 'IN_PROCESS', 'FINAL', 'REWORK']) },
        ]}
      />

      {inspections.data.length === 0 ? (
        <EmptyState
          title="Nothing in the queue"
          description="Inspections appear here as soon as a partner offers a batch."
        />
      ) : (
        <ul className="space-y-3">
          {inspections.data.map((inspection) => (
            <li key={inspection.id}>
              <Link href={`/inspector/${inspection.id}`} className="block">
                <Card className="transition-colors hover:bg-secondary/60">
                  <CardContent className="flex flex-wrap items-center gap-3 pt-6">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {inspection.inspectionNumber} · {humanise(inspection.type)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {inspection.job?.jobNumber ?? '—'}
                        {inspection.job?.component ? ` · ${inspection.job.component.name}` : ''}
                        {inspection.partner ? ` · ${inspection.partner.businessName}` : ''}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatNumber(inspection.offeredQuantity)} offered · {formatDateTime(inspection.requestedAt)}
                    </span>
                    <StatusBadge status={inspection.decision ?? inspection.status} />
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <PaginationControls page={inspections.page} totalPages={inspections.totalPages} total={inspections.total} />
    </div>
  );
}
