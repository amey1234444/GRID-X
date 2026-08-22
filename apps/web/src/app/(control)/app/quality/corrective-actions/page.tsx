import { CORRECTIVE_ACTION_STAGES } from '@gridx/shared';

import { advanceCorrectiveActionAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { DataTable, type Column } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { PaginationControls } from '@/components/app/pagination-controls';
import { SearchFilters } from '@/components/app/search-filters';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, formatNumber, humanise } from '@/lib/format';
import { optionsFrom } from '@/lib/options';
import { readPage, readParam, type SearchParams } from '@/lib/query';
import { userOptions } from '@/lib/reference';
import { apiGet } from '@/lib/session';
import { emptyPage, type CorrectiveActionRow, type Paginated } from '@/lib/types';

export const metadata = { title: 'Corrective actions · GRID-X' };

export default async function CorrectiveActionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const page = readPage(searchParams);
  const query = new URLSearchParams({ page: String(page), pageSize: '25' });
  for (const key of ['stage', 'ownerId', 'overdue']) {
    const value = readParam(searchParams, key);
    if (value) query.set(key, value);
  }

  const [actions, owners] = await Promise.all([
    apiGet<Paginated<CorrectiveActionRow>>(
      `/quality/corrective-actions?${query.toString()}`,
      emptyPage<CorrectiveActionRow>(),
    ),
    userOptions(),
  ]);

  const open = actions.data.filter((row) => row.closedAt === null);
  const overdue = open.filter((row) => (row.overdueDays ?? 0) > 0);

  const columns: Column<CorrectiveActionRow>[] = [
    {
      key: 'ca',
      header: 'CAPA',
      render: (row) => (
        <span className="block">
          <span className="block font-medium">{row.caNumber}</span>
          <span className="block text-xs text-muted-foreground">
            {row.ncNumber} · {humanise(row.defectType)}
          </span>
        </span>
      ),
    },
    {
      key: 'job',
      header: 'Job',
      render: (row) =>
        row.jobId ? (
          <a href={`/app/production/jobs/${row.jobId}`} className="hover:underline">
            {row.jobNumber}
          </a>
        ) : (
          '—'
        ),
    },
    { key: 'partner', header: 'Partner', render: (row) => row.partnerName ?? '—' },
    {
      key: 'stage',
      header: 'Stage',
      render: (row) => <StatusBadge status={row.stage} />,
    },
    {
      key: 'quantity',
      header: 'Affected',
      align: 'right',
      render: (row) => <span className="tabular-nums">{formatNumber(row.quantityAffected)}</span>,
    },
    { key: 'owner', header: 'Owner', render: (row) => row.ownerName ?? 'Unassigned' },
    {
      key: 'due',
      header: 'Due',
      render: (row) =>
        row.closedAt ? (
          <span className="text-xs text-muted-foreground">Closed {formatDate(row.closedAt)}</span>
        ) : (
          <span className={row.overdueDays ? 'font-medium text-destructive' : undefined}>
            {formatDate(row.dueDate)}
            {row.overdueDays ? ` · ${row.overdueDays}d late` : ''}
          </span>
        ),
    },
    {
      key: 'action',
      header: '',
      render: (row) =>
        row.closedAt ? null : (
          <ActionDialog
            triggerLabel="Advance"
            triggerVariant="outline"
            title={`Advance ${row.caNumber}`}
            description="Moves the corrective action to its next stage: containment, root cause, action, verification, closed."
            action={advanceCorrectiveActionAction}
            submitLabel="Advance"
            fields={[
              {
                name: 'stage',
                label: 'Move to stage',
                type: 'select',
                required: true,
                options: optionsFrom(CORRECTIVE_ACTION_STAGES),
              },
              // The four stages each record their own finding, so whichever the CAPA is moving
              // into is the one to fill in.
              { name: 'containment', label: 'Containment', type: 'textarea' },
              { name: 'rootCause', label: 'Root cause', type: 'textarea' },
              { name: 'correctiveAction', label: 'Corrective action', type: 'textarea' },
              { name: 'verification', label: 'Verification', type: 'textarea' },
            ]}
            hidden={{ actionId: row.id }}
          />
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Corrective actions"
        description="Module 8's containment-to-closure workflow, across every non-conformance in the network."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Open" value={String(open.length)} />
        <StatCard label="Past due" value={String(overdue.length)} hint="Verification overdue" />
        <StatCard label="On this page" value={String(actions.data.length)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Corrective action queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchFilters
            searchPlaceholder="Search…"
            filters={[
              { name: 'stage', label: 'Stage', options: optionsFrom(CORRECTIVE_ACTION_STAGES) },
              { name: 'ownerId', label: 'Owner', options: owners },
              {
                name: 'overdue',
                label: 'Overdue',
                options: [{ value: 'true', label: 'Past due only' }],
              },
            ]}
          />
          <DataTable
            columns={columns}
            rows={actions.data}
            empty={{
              title: 'No corrective actions',
              description:
                'Corrective actions raised against a non-conformance appear here until they are verified and closed.',
            }}
          />
          <PaginationControls
            page={page}
            totalPages={actions.totalPages}
            total={actions.total}
          />
        </CardContent>
      </Card>
    </div>
  );
}
