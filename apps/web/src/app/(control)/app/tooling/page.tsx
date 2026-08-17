import { TOOL_CATEGORIES, TOOL_CONDITIONS } from '@gridx/shared';

import { calibrateToolAction, createToolAction, issueToolAction, returnToolAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { DataTable, type Column } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { PaginationControls } from '@/components/app/pagination-controls';
import { SearchFilters } from '@/components/app/search-filters';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { formatCurrency, formatDate, formatNumber, humanise } from '@/lib/format';
import { optionsFrom } from '@/lib/options';
import { readPage, readParam, type SearchParams } from '@/lib/query';
import { defaultCompanyId, jobOptions, partnerOptions } from '@/lib/reference';
import { apiGet } from '@/lib/session';
import { emptyPage, type Paginated, type ToolRow } from '@/lib/types';

export const metadata = { title: 'Tooling · GRID-X' };

export default async function ToolingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const page = readPage(searchParams);
  const query = new URLSearchParams({ page: String(page), pageSize: '25' });
  for (const key of ['search', 'category', 'condition']) {
    const value = readParam(searchParams, key);
    if (value) query.set(key, value);
  }

  const [tools, partners, jobs, companyId] = await Promise.all([
    apiGet<Paginated<ToolRow>>(`/tooling/tools?${query.toString()}`, emptyPage<ToolRow>()),
    partnerOptions(),
    jobOptions(),
    defaultCompanyId(),
  ]);

  const today = new Date();
  const calibrationDue = tools.data.filter(
    (row) => row.nextCalibrationDue !== null && new Date(row.nextCalibrationDue) <= today,
  ).length;

  const columns: Column<ToolRow>[] = [
    {
      key: 'tool',
      header: 'Tool',
      render: (row) => (
        <span className="block">
          <span className="block font-medium">{row.toolCode}</span>
          <span className="block text-xs text-muted-foreground">{row.description}</span>
        </span>
      ),
    },
    { key: 'category', header: 'Category', render: (row) => humanise(row.category) },
    { key: 'condition', header: 'Condition', render: (row) => <StatusBadge status={row.condition} /> },
    { key: 'owner', header: 'Owner', render: (row) => row.ownerName },
    {
      key: 'location',
      header: 'Currently with',
      render: (row) => {
        const open = row.issues.find((issue) => issue.status === 'ISSUED' || issue.status === 'OVERDUE');
        return open?.partner?.businessName ?? 'OSWAR store';
      },
    },
    {
      key: 'calibration',
      header: 'Calibration due',
      render: (row) => {
        if (!row.calibrationRequired) return <span className="text-muted-foreground">Not required</span>;
        const due = row.nextCalibrationDue;
        const overdue = due !== null && new Date(due) <= today;
        return <span className={overdue ? 'font-medium text-destructive' : undefined}>{formatDate(due)}</span>;
      },
    },
    { key: 'value', header: 'Value', align: 'right', render: (row) => formatCurrency(row.replacementValue) },
    {
      key: 'actions',
      header: '',
      render: (row) => {
        const open = row.issues.find((issue) => issue.status === 'ISSUED' || issue.status === 'OVERDUE');
        return (
          <span className="flex flex-wrap gap-2">
            {open ? (
              <ActionDialog
                title="Return tool"
                triggerLabel="Return"
                triggerSize="sm"
                triggerVariant="outline"
                action={returnToolAction}
                hidden={{ issueId: open.id }}
                fields={[
                  {
                    name: 'conditionOnReturn',
                    label: 'Condition on return',
                    type: 'select',
                    options: optionsFrom(TOOL_CONDITIONS),
                    defaultValue: 'GOOD',
                    span: 2,
                  },
                  { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
                ]}
              />
            ) : (
              <ActionDialog
                title="Issue tool"
                triggerLabel="Issue"
                triggerSize="sm"
                triggerVariant="outline"
                action={issueToolAction}
                hidden={{ toolId: row.id }}
                fields={[
                  { name: 'partnerId', label: 'Partner', type: 'select', required: true, options: partners, span: 2 },
                  { name: 'jobId', label: 'Job', type: 'select', options: jobs, span: 2 },
                  { name: 'expectedReturnDate', label: 'Expected return', type: 'date' },
                  {
                    name: 'conditionOnIssue',
                    label: 'Condition on issue',
                    type: 'select',
                    options: optionsFrom(TOOL_CONDITIONS),
                    defaultValue: 'GOOD',
                  },
                  { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
                ]}
              />
            )}
            {row.calibrationRequired ? (
              <ActionDialog
                title="Record calibration"
                triggerLabel="Calibrate"
                triggerSize="sm"
                triggerVariant="ghost"
                action={calibrateToolAction}
                hidden={{ toolId: row.id }}
                fields={[
                  { name: 'calibratedAt', label: 'Calibrated at', type: 'date' },
                  { name: 'nextDueAt', label: 'Next due', type: 'date' },
                  { name: 'agency', label: 'Agency' },
                  { name: 'certificateNo', label: 'Certificate number' },
                  { name: 'result', label: 'Result', span: 2 },
                ]}
              />
            ) : null}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tooling & gauges"
        description="OSWAR-owned tools, fixtures and gauges issued to partners, with calibration control."
        actions={
          <ActionDialog
            title="Add tool"
            triggerLabel="Add tool"
            action={createToolAction}
            hidden={{ companyId }}
            fields={[
              { name: 'category', label: 'Category', type: 'select', options: optionsFrom(TOOL_CATEGORIES), defaultValue: 'TOOL' },
              { name: 'condition', label: 'Condition', type: 'select', options: optionsFrom(TOOL_CONDITIONS), defaultValue: 'GOOD' },
              { name: 'description', label: 'Description', required: true, span: 2 },
              { name: 'ownerName', label: 'Owner', defaultValue: 'OSWAR' },
              { name: 'replacementValue', label: 'Replacement value', type: 'number', step: '0.01' },
              { name: 'calibrationRequired', label: 'Calibration required', type: 'checkbox' },
              { name: 'calibrationFrequencyDays', label: 'Calibration frequency (days)', type: 'number' },
            ]}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tools" value={formatNumber(tools.total)} />
        <StatCard
          label="Issued to partners"
          value={formatNumber(
            tools.data.filter((row) => row.issues.some((issue) => issue.status === 'ISSUED' || issue.status === 'OVERDUE'))
              .length,
          )}
        />
        <StatCard label="Calibration due" value={formatNumber(calibrationDue)} tone={calibrationDue > 0 ? 'destructive' : 'success'} />
        <StatCard label="Asset value" value={formatCurrency(tools.data.reduce((sum, row) => sum + row.replacementValue, 0))} />
      </div>

      <SearchFilters
        searchPlaceholder="Search by tool code or description…"
        filters={[
          { name: 'category', label: 'Category', options: optionsFrom(TOOL_CATEGORIES) },
          { name: 'condition', label: 'Condition', options: optionsFrom(TOOL_CONDITIONS) },
        ]}
      />

      <DataTable columns={columns} rows={tools.data} empty={{ title: 'No tools', description: 'Register tools, fixtures and gauges.' }} />

      <PaginationControls page={tools.page} totalPages={tools.totalPages} total={tools.total} />
    </div>
  );
}
