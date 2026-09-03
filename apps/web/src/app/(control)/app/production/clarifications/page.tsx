import { CLARIFICATION_STATUSES } from '@gridx/shared';

import { answerClarificationAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { DataTable, type Column } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { PaginationControls } from '@/components/app/pagination-controls';
import { SearchFilters } from '@/components/app/search-filters';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/format';
import { optionsFrom } from '@/lib/options';
import { readPage, readParam, type SearchParams } from '@/lib/query';
import { partnerOptions } from '@/lib/reference';
import { apiGet } from '@/lib/session';
import { emptyPage, type ClarificationRow, type Paginated } from '@/lib/types';

export const metadata = { title: 'Clarifications · GRID-X' };

export default async function ClarificationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const page = readPage(searchParams);
  const query = new URLSearchParams({ page: String(page), pageSize: '25' });
  for (const key of ['partnerId', 'status']) {
    const value = readParam(searchParams, key);
    if (value) query.set(key, value);
  }

  const [clarifications, partners] = await Promise.all([
    apiGet<Paginated<ClarificationRow>>(
      `/jobs/clarifications?${query.toString()}`,
      emptyPage<ClarificationRow>(),
    ),
    partnerOptions(),
  ]);

  const open = clarifications.data.filter((row) => row.status === 'OPEN');
  // A question left unanswered for a week is usually a job that has quietly stopped.
  const stale = open.filter((row) => (row.openForDays ?? 0) >= 7);

  const columns: Column<ClarificationRow>[] = [
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
      key: 'question',
      header: 'Question',
      render: (row) => (
        <span className="block max-w-md">
          <span className="block">{row.question}</span>
          {row.answer ? (
            <span className="block text-xs text-muted-foreground">Answered: {row.answer}</span>
          ) : null}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'waiting',
      header: 'Waiting',
      align: 'right',
      render: (row) =>
        row.openForDays === null ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <span
            className={
              row.openForDays >= 7 ? 'font-medium tabular-nums text-destructive' : 'tabular-nums'
            }
          >
            {row.openForDays}d
          </span>
        ),
    },
    {
      key: 'raised',
      header: 'Raised',
      render: (row) => (
        <span className="block">
          <span className="block">{formatDate(row.raisedAt)}</span>
          <span className="block text-xs text-muted-foreground">{row.raisedByName ?? '—'}</span>
        </span>
      ),
    },
    {
      key: 'action',
      header: '',
      render: (row) =>
        row.status === 'OPEN' ? (
          <ActionDialog
            triggerLabel="Answer"
            title={`Answer the question on ${row.jobNumber}`}
            description={row.question}
            action={answerClarificationAction}
            submitLabel="Send to partner"
            fields={[
              {
                name: 'answer',
                label: 'Answer',
                type: 'textarea',
                required: true,
                placeholder: 'Give the partner what they need to carry on.',
              },
            ]}
            hidden={{ clarificationId: row.id }}
          />
        ) : (
          <span className="text-xs text-muted-foreground">
            {row.answeredByName ? `by ${row.answeredByName}` : ''}
          </span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon="Cog"
        title="Clarifications"
        description="Questions raised by partners against live jobs. A question left unanswered is usually a job that has stopped."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Open questions" value={String(open.length)} />
        <StatCard
          label="Waiting a week or more"
          value={String(stale.length)}
          hint="Likely holding up production"
        />
        <StatCard label="Total on this page" value={String(clarifications.data.length)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clarification queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchFilters
            searchPlaceholder="Search jobs…"
            filters={[
              { name: 'partnerId', label: 'Partner', options: partners },
              { name: 'status', label: 'Status', options: optionsFrom(CLARIFICATION_STATUSES) },
            ]}
          />
          <DataTable
            columns={columns}
            rows={clarifications.data}
            empty={{
              title: 'No questions outstanding',
              description: 'Questions raised by partners on their jobs appear here.',
            }}
          />
          <PaginationControls
            page={page}
            totalPages={clarifications.totalPages}
            total={clarifications.total}
          />
        </CardContent>
      </Card>
    </div>
  );
}
