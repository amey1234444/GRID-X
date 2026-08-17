import Link from 'next/link';

import { advanceCorrectiveActionAction, createCorrectiveActionAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { EmptyState } from '@/components/app/empty-state';
import { PageHeader } from '@/components/app/page-header';
import { PaginationControls } from '@/components/app/pagination-controls';
import { SearchFilters } from '@/components/app/search-filters';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatDateTime, formatNumber, humanise } from '@/lib/format';
import { optionsFrom } from '@/lib/options';
import { readPage, readParam, type SearchParams } from '@/lib/query';
import { apiGet } from '@/lib/session';
import { emptyPage, type NonConformanceRow, type Paginated } from '@/lib/types';

export const metadata = { title: 'Non-conformances · GRID-X Inspector' };

export default async function InspectorNonConformancesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const page = readPage(searchParams);
  const query = new URLSearchParams({ page: String(page), pageSize: '20' });
  for (const key of ['search', 'defectType']) {
    const value = readParam(searchParams, key);
    if (value) query.set(key, value);
  }

  const ncs = await apiGet<Paginated<NonConformanceRow>>(
    `/quality/non-conformances?${query.toString()}`,
    emptyPage<NonConformanceRow>(),
  );

  const open = ncs.data.filter((row) => row.closedAt === null);
  const reworkCost = ncs.data.reduce((sum, row) => sum + row.reworkCost, 0);
  const materialLoss = ncs.data.reduce((sum, row) => sum + row.materialLoss, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Non-conformances"
        description="Every rejection raises a non-conformance with defect type, responsibility and cost so repeat defects are visible."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total" value={formatNumber(ncs.total)} />
        <StatCard label="Open" value={formatNumber(open.length)} tone={open.length > 0 ? 'warning' : 'default'} />
        <StatCard label="Rework cost" value={formatCurrency(reworkCost)} />
        <StatCard label="Material loss" value={formatCurrency(materialLoss)} tone={materialLoss > 0 ? 'destructive' : 'default'} />
      </div>

      <SearchFilters
        searchPlaceholder="Search NC number, job or partner…"
        filters={[
          {
            name: 'defectType',
            label: 'Defect type',
            options: optionsFrom([
              'DIMENSIONAL',
              'SURFACE_FINISH',
              'WELD_DEFECT',
              'MATERIAL_DEFECT',
              'ASSEMBLY_ERROR',
              'MISSING_OPERATION',
              'DAMAGE_IN_TRANSIT',
              'OTHER',
            ]),
          },
        ]}
      />

      {ncs.data.length === 0 ? (
        <EmptyState title="No non-conformances" description="Rejections raised during inspection appear here." />
      ) : (
        <ul className="space-y-3">
          {ncs.data.map((nc) => (
            <li key={nc.id}>
              <Card>
                <CardContent className="space-y-3 pt-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {nc.ncNumber} · {humanise(nc.defectType)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {nc.job ? (
                          <Link href={`/app/production/jobs/${nc.job.id}`} className="text-primary hover:underline">
                            {nc.job.jobNumber}
                          </Link>
                        ) : (
                          '—'
                        )}
                        {nc.partner ? ` · ${nc.partner.businessName}` : ''} · {formatDateTime(nc.raisedAt)}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatNumber(nc.quantityAffected)} affected · {humanise(nc.responsibility)}
                    </span>
                    <StatusBadge status={nc.closedAt ? 'CLOSED' : 'OPEN'} />
                    {nc.correctiveActions.length === 0 ? (
                      <ActionDialog
                        title="Raise corrective action"
                        triggerLabel="Corrective action"
                        triggerVariant="outline"
                        submitLabel="Raise"
                        action={createCorrectiveActionAction}
                        hidden={{ nonConformanceId: nc.id }}
                        fields={[
                          { name: 'rootCause', label: 'Root cause', type: 'textarea', required: true, span: 2 },
                          { name: 'action', label: 'Corrective action', type: 'textarea', required: true, span: 2 },
                          { name: 'targetDate', label: 'Target date', type: 'date' },
                          { name: 'preventiveAction', label: 'Preventive action', type: 'textarea', span: 2 },
                        ]}
                      />
                    ) : null}
                  </div>
                  {nc.probableCause ? (
                    <p className="rounded-md bg-secondary p-2 text-xs text-muted-foreground">{nc.probableCause}</p>
                  ) : null}
                  {nc.correctiveActions.map((action) => (
                    <div key={action.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                      <span className="min-w-0 flex-1 truncate text-sm">{action.action ?? 'Corrective action'}</span>
                      <StatusBadge status={action.status} />
                      <ActionDialog
                        title="Advance corrective action"
                        description="Move the action through verification to closure with evidence."
                        triggerLabel="Update"
                        triggerVariant="outline"
                        submitLabel="Update"
                        action={advanceCorrectiveActionAction}
                        hidden={{ correctiveActionId: action.id }}
                        fields={[
                          {
                            name: 'status',
                            label: 'Status',
                            type: 'select',
                            required: true,
                            options: optionsFrom(['IN_PROGRESS', 'VERIFICATION_PENDING', 'CLOSED']),
                            span: 2,
                          },
                          { name: 'verificationNote', label: 'Verification note', type: 'textarea', span: 2 },
                        ]}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <PaginationControls page={ncs.page} totalPages={ncs.totalPages} total={ncs.total} />
    </div>
  );
}
