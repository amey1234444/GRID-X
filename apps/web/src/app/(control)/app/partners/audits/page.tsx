import { PARTNER_AUDIT_STATUSES } from '@gridx/shared';

import { DataTable, type Column } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { PaginationControls } from '@/components/app/pagination-controls';
import { SearchFilters } from '@/components/app/search-filters';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, humanise } from '@/lib/format';
import { optionsFrom } from '@/lib/options';
import { readPage, readParam, type SearchParams } from '@/lib/query';
import { partnerOptions } from '@/lib/reference';
import { apiGet } from '@/lib/session';
import { emptyPage, type Paginated, type PartnerAuditRow } from '@/lib/types';

export const metadata = { title: 'Partner audits · GRID-X' };

export default async function PartnerAuditsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const page = readPage(searchParams);
  const query = new URLSearchParams({ page: String(page), pageSize: '25' });
  for (const key of ['partnerId', 'result']) {
    const value = readParam(searchParams, key);
    if (value) query.set(key, value);
  }

  const [audits, partners] = await Promise.all([
    apiGet<Paginated<PartnerAuditRow>>(
      `/partners/audits?${query.toString()}`,
      emptyPage<PartnerAuditRow>(),
    ),
    partnerOptions(),
  ]);

  const now = Date.now();
  const failed = audits.data.filter((row) => row.status === 'FAILED');
  const reAuditDue = audits.data.filter(
    (row) => row.nextAuditDate !== null && new Date(row.nextAuditDate).getTime() < now,
  );

  const columns: Column<PartnerAuditRow>[] = [
    {
      key: 'partner',
      header: 'Partner',
      render: (row) => (
        <a href={`/app/partners/${row.partnerId}`} className="block hover:underline">
          <span className="block font-medium">{row.partnerName}</span>
          <span className="block text-xs text-muted-foreground">{row.city}</span>
        </a>
      ),
    },
    { key: 'type', header: 'Type', render: (row) => humanise(row.auditType) },
    { key: 'date', header: 'Audited', render: (row) => formatDate(row.auditDate) },
    {
      key: 'score',
      header: 'Score',
      align: 'right',
      render: (row) =>
        row.score === null ? '—' : <span className="tabular-nums">{row.score.toFixed(1)}</span>,
    },
    { key: 'status', header: 'Result', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'findings',
      header: 'Findings',
      render: (row) => (
        <span className="block max-w-sm text-muted-foreground">{row.findings ?? '—'}</span>
      ),
    },
    { key: 'auditor', header: 'Auditor', render: (row) => row.auditorName ?? '—' },
    {
      key: 'next',
      header: 'Next due',
      render: (row) => {
        if (!row.nextAuditDate) return '—';
        const overdue = new Date(row.nextAuditDate).getTime() < now;
        return (
          <span className={overdue ? 'font-medium text-destructive' : undefined}>
            {formatDate(row.nextAuditDate)}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Partner audits"
        description="Capability and quality audits across the network, and which partners are due another."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Audits on this page" value={String(audits.data.length)} />
        <StatCard label="Failed" value={String(failed.length)} hint="Blocks progression" />
        <StatCard
          label="Re-audit overdue"
          value={String(reAuditDue.length)}
          hint="Next audit date has passed"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audit history</CardTitle>
          <CardDescription>
            Module 1&rsquo;s approval workflow runs through a capability audit, so a partner cannot move
            past Trial Approved without one on record.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchFilters
            searchPlaceholder="Search…"
            filters={[
              { name: 'partnerId', label: 'Partner', options: partners },
              { name: 'result', label: 'Result', options: optionsFrom(PARTNER_AUDIT_STATUSES) },
            ]}
          />
          <DataTable
            columns={columns}
            rows={audits.data}
            empty={{
              title: 'No audits recorded',
              description: 'Audits recorded against a partner appear here.',
            }}
          />
          <PaginationControls page={page} totalPages={audits.totalPages} total={audits.total} />
        </CardContent>
      </Card>
    </div>
  );
}
