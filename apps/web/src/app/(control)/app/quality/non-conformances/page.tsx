import { CORRECTIVE_ACTION_STAGES, DEFECT_TYPES } from '@gridx/shared';

import { advanceCorrectiveActionAction, createCorrectiveActionAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { CategoryBarChart } from '@/components/app/charts';
import { DataTable, type Column } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { PaginationControls } from '@/components/app/pagination-controls';
import { SearchFilters } from '@/components/app/search-filters';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate, formatNumber, humanise } from '@/lib/format';
import { optionsFrom } from '@/lib/options';
import { readPage, readParam, type SearchParams } from '@/lib/query';
import { partnerOptions } from '@/lib/reference';
import { apiGet } from '@/lib/session';
import { emptyPage, type NonConformanceRow, type Paginated } from '@/lib/types';

export const metadata = { title: 'Non-conformances · GRID-X' };

export default async function NonConformancesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const page = readPage(searchParams);
  const query = new URLSearchParams({ page: String(page), pageSize: '25' });
  for (const key of ['search', 'defectType', 'partnerId', 'responsibility']) {
    const value = readParam(searchParams, key);
    if (value) query.set(key, value);
  }

  const [ncs, partners] = await Promise.all([
    apiGet<Paginated<NonConformanceRow>>(`/quality/non-conformances?${query.toString()}`, emptyPage<NonConformanceRow>()),
    partnerOptions(),
  ]);

  const byDefect = new Map<string, number>();
  for (const nc of ncs.data) {
    byDefect.set(nc.defectType, (byDefect.get(nc.defectType) ?? 0) + nc.quantityAffected);
  }
  const chart = Array.from(byDefect.entries())
    .map(([defect, quantity]) => ({ defect: humanise(defect), quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);

  const columns: Column<NonConformanceRow>[] = [
    {
      key: 'nc',
      header: 'NC',
      render: (row) => (
        <span className="block">
          <span className="block font-medium">{row.ncNumber}</span>
          <span className="block text-xs text-muted-foreground">{formatDate(row.raisedAt)}</span>
        </span>
      ),
    },
    { key: 'job', header: 'Job', render: (row) => row.job?.jobNumber ?? '—' },
    { key: 'partner', header: 'Partner', render: (row) => row.partner?.businessName ?? '—' },
    { key: 'defect', header: 'Defect', render: (row) => humanise(row.defectType) },
    { key: 'qty', header: 'Quantity', align: 'right', render: (row) => formatNumber(row.quantityAffected) },
    { key: 'responsibility', header: 'Responsibility', render: (row) => humanise(row.responsibility) },
    {
      key: 'cost',
      header: 'Rework / material loss',
      align: 'right',
      render: (row) => `${formatCurrency(row.reworkCost)} / ${formatCurrency(row.materialLoss)}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.closedAt ? 'CLOSED' : 'OPEN'} />,
    },
    {
      key: 'capa',
      header: 'Corrective action',
      render: (row) =>
        row.correctiveActions.length === 0 ? (
          row.correctiveActionRequired ? (
            <ActionDialog
              title="Raise corrective action"
              triggerLabel="Raise CAPA"
              triggerSize="sm"
              triggerVariant="outline"
              action={createCorrectiveActionAction}
              hidden={{ nonConformanceId: row.id, partnerId: row.partner?.id }}
              fields={[
                { name: 'rootCause', label: 'Root cause', type: 'textarea', span: 2 },
                { name: 'action', label: 'Corrective action', type: 'textarea', required: true, span: 2 },
                { name: 'dueDate', label: 'Due date', type: 'date' },
                { name: 'ownerName', label: 'Owner' },
              ]}
            />
          ) : (
            <span className="text-muted-foreground">Not required</span>
          )
        ) : (
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={row.correctiveActions[0].status} />
            <ActionDialog
              title="Update corrective action"
              triggerLabel="Update"
              triggerSize="sm"
              triggerVariant="ghost"
              action={advanceCorrectiveActionAction}
              hidden={{ correctiveActionId: row.correctiveActions[0].id }}
              fields={[
                {
                  name: 'status',
                  label: 'Status',
                  type: 'select',
                  required: true,
                  options: optionsFrom(CORRECTIVE_ACTION_STAGES),
                  span: 2,
                },
                { name: 'action', label: 'Action taken', type: 'textarea', span: 2 },
                { name: 'effectivenessCheck', label: 'Effectiveness check', type: 'textarea', span: 2 },
              ]}
            />
          </span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Non-conformances"
        description="Every rejection with defect type, responsibility, cost impact and corrective action tracking."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Non-conformances" value={formatNumber(ncs.total)} />
        <StatCard
          label="Open"
          value={formatNumber(ncs.data.filter((row) => row.closedAt === null).length)}
          tone="warning"
        />
        <StatCard
          label="Quantity affected"
          value={formatNumber(ncs.data.reduce((sum, row) => sum + row.quantityAffected, 0))}
          tone="destructive"
        />
        <StatCard
          label="Cost impact"
          value={formatCurrency(ncs.data.reduce((sum, row) => sum + row.reworkCost + row.materialLoss, 0))}
        />
      </div>

      {chart.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Defect pareto</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBarChart data={chart} xKey="defect" valueKey="quantity" label="Quantity" horizontal />
          </CardContent>
        </Card>
      ) : null}

      <SearchFilters
        searchPlaceholder="Search by NC number or job…"
        filters={[
          { name: 'defectType', label: 'Defect', options: optionsFrom(DEFECT_TYPES) },
          { name: 'partnerId', label: 'Partner', options: partners },
        ]}
      />

      <DataTable
        columns={columns}
        rows={ncs.data}
        empty={{ title: 'No non-conformances', description: 'Rejections raised during inspection appear here.' }}
      />

      <PaginationControls page={ncs.page} totalPages={ncs.totalPages} total={ncs.total} />
    </div>
  );
}
