import { DELAY_REASONS, RESPONSIBLE_PARTIES } from '@gridx/shared';

import { resolveDelayAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { CategoryBarChart } from '@/components/app/charts';
import { DataTable, type Column } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { PaginationControls } from '@/components/app/pagination-controls';
import { SearchFilters } from '@/components/app/search-filters';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, humanise } from '@/lib/format';
import { optionsFrom } from '@/lib/options';
import { readPage, readParam, type SearchParams } from '@/lib/query';
import { partnerOptions } from '@/lib/reference';
import { apiGet } from '@/lib/session';
import { emptyPage, type DelayRow, type Paginated } from '@/lib/types';

export const metadata = { title: 'Delays · GRID-X' };

export default async function DelaysPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const page = readPage(searchParams);
  const query = new URLSearchParams({ page: String(page), pageSize: '25' });
  for (const key of ['partnerId', 'reason', 'responsibility']) {
    const value = readParam(searchParams, key);
    if (value) query.set(key, value);
  }
  // Default to the delays still costing time; the filter lets you see the closed ones too.
  const showAll = readParam(searchParams, 'showAll') === '1';
  if (!showAll) query.set('openOnly', 'true');

  const [delays, partners] = await Promise.all([
    apiGet<Paginated<DelayRow>>(`/jobs/delays?${query.toString()}`, emptyPage<DelayRow>()),
    partnerOptions(),
  ]);

  const open = delays.data.filter((delay) => !delay.resolvedAt);
  const ours = open.filter((delay) => delay.responsibility === 'OSWAR');
  const theirs = open.filter((delay) => delay.responsibility === 'PARTNER');

  // Module 7 exists to answer this one question, so it leads the page.
  const byResponsibility = new Map<string, number>();
  for (const delay of open) {
    byResponsibility.set(
      delay.responsibility,
      (byResponsibility.get(delay.responsibility) ?? 0) + 1,
    );
  }
  const chart = Array.from(byResponsibility.entries())
    .map(([responsibility, count]) => ({ responsibility: humanise(responsibility), count }))
    .sort((a, b) => b.count - a.count);

  const columns: Column<DelayRow>[] = [
    {
      key: 'job',
      header: 'Job',
      render: (row) => (
        <a href={`/app/production/jobs/${row.jobId}`} className="block hover:underline">
          <span className="block font-medium">{row.jobNumber}</span>
          <span className="block text-xs text-muted-foreground">
            {row.componentCode} · {row.componentName}
          </span>
        </a>
      ),
    },
    { key: 'partner', header: 'Partner', render: (row) => row.partnerName ?? '—' },
    {
      key: 'reason',
      header: 'Reason',
      render: (row) => (
        <span className="block">
          <span className="block">{humanise(row.reason)}</span>
          {row.detail ? (
            <span className="block text-xs text-muted-foreground">{row.detail}</span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'responsibility',
      header: 'Whose',
      render: (row) => <StatusBadge status={row.responsibility} />,
    },
    {
      key: 'delayDays',
      header: 'Days',
      align: 'right',
      render: (row) => <span className="tabular-nums">{row.delayDays}</span>,
    },
    {
      key: 'expected',
      header: 'Expected',
      render: (row) => formatDate(row.expectedCompletionDate),
    },
    {
      key: 'reported',
      header: 'Reported',
      render: (row) => (
        <span className="block">
          <span className="block">{formatDate(row.reportedAt)}</span>
          <span className="block text-xs text-muted-foreground">{row.reportedByName ?? '—'}</span>
        </span>
      ),
    },
    {
      key: 'action',
      header: '',
      render: (row) =>
        row.resolvedAt ? (
          <span className="text-xs text-muted-foreground">
            Closed {formatDate(row.resolvedAt)}
          </span>
        ) : (
          <ActionDialog
            triggerLabel="Mark recovered"
            triggerVariant="outline"
            title={`Close the delay on ${row.jobNumber}`}
            description="Records that this job is no longer held up. The delay stays on the record and keeps counting towards the partner's scorecard."
            action={resolveDelayAction}
            submitLabel="Mark recovered"
            fields={[]}
            hidden={{ delayId: row.id }}
          />
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delays"
        description="Every job currently held up, and whose side the hold-up is on. Recorded from the partner's milestone updates."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Open delays" value={String(open.length)} />
        <StatCard
          label="Caused by OSWAR"
          value={String(ours.length)}
          hint="Drawings, approvals or material we owe"
        />
        <StatCard label="Caused by the partner" value={String(theirs.length)} />
      </div>

      {chart.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Where the delay sits</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBarChart data={chart} xKey="responsibility" valueKey="count" label="Open delays" horizontal />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delay register</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchFilters
            searchPlaceholder="Search jobs…"
            filters={[
              { name: 'partnerId', label: 'Partner', options: partners },
              { name: 'reason', label: 'Reason', options: optionsFrom(DELAY_REASONS) },
              {
                name: 'responsibility',
                label: 'Responsibility',
                options: optionsFrom(RESPONSIBLE_PARTIES),
              },
              {
                name: 'showAll',
                label: 'Include recovered',
                options: [{ value: '1', label: 'Show recovered delays' }],
              },
            ]}
          />
          <DataTable
            columns={columns}
            rows={delays.data}
            empty={{
              title: 'No open delays',
              description: 'Every job is running to plan. Delays appear here as partners report them.',
            }}
          />
          <PaginationControls page={page} totalPages={delays.totalPages} total={delays.total} />
        </CardContent>
      </Card>
    </div>
  );
}
