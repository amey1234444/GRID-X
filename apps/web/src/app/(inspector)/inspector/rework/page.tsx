import { updateReworkAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { EmptyState } from '@/components/app/empty-state';
import { PageHeader } from '@/components/app/page-header';
import { PaginationControls } from '@/components/app/pagination-controls';
import { SearchFilters } from '@/components/app/search-filters';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';
import { optionsFrom } from '@/lib/options';
import { readPage, readParam, type SearchParams } from '@/lib/query';
import { apiGet } from '@/lib/session';
import { emptyPage, type Paginated, type ReworkRow } from '@/lib/types';

export const metadata = { title: 'Rework · GRID-X Inspector' };

export default async function InspectorReworkPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const page = readPage(searchParams);
  const query = new URLSearchParams({ page: String(page), pageSize: '20' });
  for (const key of ['search', 'status']) {
    const value = readParam(searchParams, key);
    if (value) query.set(key, value);
  }

  const rework = await apiGet<Paginated<ReworkRow>>(`/quality/rework?${query.toString()}`, emptyPage<ReworkRow>());

  const open = rework.data.filter((row) => row.status !== 'COMPLETED' && row.status !== 'SCRAPPED');
  const chargeable = rework.data.filter((row) => row.chargeToPartner);
  const cost = rework.data.reduce((sum, row) => sum + row.estimatedCost, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Rework"
        description="Rework orders raised from rejections, tracked to completion or scrap with cost responsibility."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total" value={formatNumber(rework.total)} />
        <StatCard label="Open" value={formatNumber(open.length)} tone={open.length > 0 ? 'warning' : 'default'} />
        <StatCard label="Chargeable to partner" value={formatNumber(chargeable.length)} />
        <StatCard label="Estimated cost" value={formatCurrency(cost)} />
      </div>

      <SearchFilters
        searchPlaceholder="Search rework number or job…"
        filters={[
          {
            name: 'status',
            label: 'Status',
            options: optionsFrom(['ISSUED', 'IN_PROGRESS', 'READY_FOR_REINSPECTION', 'COMPLETED', 'SCRAPPED']),
          },
        ]}
      />

      {rework.data.length === 0 ? (
        <EmptyState title="No rework orders" description="Rework raised during inspection appears here." />
      ) : (
        <ul className="space-y-3">
          {rework.data.map((order) => (
            <li key={order.id}>
              <Card>
                <CardContent className="space-y-3 pt-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{order.reworkNumber}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {order.job?.jobNumber ?? '—'} · {formatNumber(order.quantity)} nos ·{' '}
                        {order.chargeToPartner ? 'charged to partner' : 'OSWAR cost'}
                        {order.dueDate ? ` · due ${formatDate(order.dueDate)}` : ''}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                    <ActionDialog
                      title="Update rework"
                      triggerLabel="Update"
                      triggerVariant="outline"
                      submitLabel="Update"
                      action={updateReworkAction}
                      hidden={{ reworkId: order.id }}
                      fields={[
                        {
                          name: 'status',
                          label: 'Status',
                          type: 'select',
                          required: true,
                          options: optionsFrom([
                            'IN_PROGRESS',
                            'READY_FOR_REINSPECTION',
                            'COMPLETED',
                            'SCRAPPED',
                          ]),
                          span: 2,
                        },
                        { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
                      ]}
                    />
                  </div>
                  <p className="rounded-md bg-secondary p-2 text-xs text-muted-foreground">{order.instructions}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <PaginationControls page={rework.page} totalPages={rework.totalPages} total={rework.total} />
    </div>
  );
}
