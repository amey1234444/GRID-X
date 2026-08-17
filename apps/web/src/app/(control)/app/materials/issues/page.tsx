import { createMaterialIssueAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { DataTable, type Column } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { PaginationControls } from '@/components/app/pagination-controls';
import { SearchFilters } from '@/components/app/search-filters';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { formatDate, formatNumber } from '@/lib/format';
import { optionsFrom } from '@/lib/options';
import { readPage, readParam, type SearchParams } from '@/lib/query';
import { itemOptions, jobOptions, partnerOptions } from '@/lib/reference';
import { apiGet } from '@/lib/session';
import { emptyPage, type MaterialIssueRow, type Paginated } from '@/lib/types';

export const metadata = { title: 'Material issues · GRID-X' };

export default async function MaterialIssuesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const page = readPage(searchParams);
  const query = new URLSearchParams({ page: String(page), pageSize: '25' });
  for (const key of ['search', 'status', 'partnerId']) {
    const value = readParam(searchParams, key);
    if (value) query.set(key, value);
  }

  const [issues, partners, jobs, items] = await Promise.all([
    apiGet<Paginated<MaterialIssueRow>>(`/materials/issues?${query.toString()}`, emptyPage<MaterialIssueRow>()),
    partnerOptions(),
    jobOptions(),
    itemOptions(),
  ]);

  const unacknowledged = issues.data.filter((issue) => issue.acknowledgements.length === 0).length;
  const shortage = issues.data.reduce(
    (sum, issue) => sum + issue.acknowledgements.reduce((inner, ack) => inner + ack.shortageWeightKg, 0),
    0,
  );

  const columns: Column<MaterialIssueRow>[] = [
    {
      key: 'challan',
      header: 'Challan',
      render: (row) => (
        <span className="block">
          <span className="block font-medium">{row.challanNumber}</span>
          <span className="block text-xs text-muted-foreground">{formatDate(row.issueDate)}</span>
        </span>
      ),
    },
    { key: 'job', header: 'Job', render: (row) => row.job?.jobNumber ?? '—' },
    { key: 'partner', header: 'Partner', render: (row) => row.partner?.businessName ?? '—' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'weight',
      header: 'Issued (kg)',
      align: 'right',
      render: (row) => formatNumber(row.totalIssueWeightKg, 3),
    },
    {
      key: 'ack',
      header: 'Acknowledged',
      render: (row) =>
        row.acknowledgements.length === 0 ? (
          <StatusBadge status="PENDING" />
        ) : (
          <span className="text-sm">
            {formatNumber(row.acknowledgements[0].receivedWeightKg, 3)} kg
            {row.acknowledgements[0].shortageWeightKg > 0 ? (
              <span className="ml-1 text-destructive">
                (-{formatNumber(row.acknowledgements[0].shortageWeightKg, 3)})
              </span>
            ) : null}
          </span>
        ),
    },
    { key: 'vehicle', header: 'Vehicle', render: (row) => row.vehicleNumber ?? '—' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Material issues"
        description="Delivery challans for material issued to partners, with partner acknowledgement and shortage tracking."
        actions={
          <ActionDialog
            title="Issue material"
            triggerLabel="Issue material"
            action={createMaterialIssueAction}
            fields={[
              { name: 'jobId', label: 'Job', type: 'select', required: true, options: jobs, span: 2 },
              { name: 'partnerId', label: 'Partner', type: 'select', required: true, options: partners, span: 2 },
              { name: 'itemId', label: 'Item', type: 'select', required: true, options: items, span: 2 },
              { name: 'quantity', label: 'Quantity', type: 'number', required: true },
              { name: 'uom', label: 'UOM', defaultValue: 'KG' },
              { name: 'issueWeightKg', label: 'Issue weight (kg)', type: 'number', step: '0.001' },
              { name: 'heatNumber', label: 'Heat number' },
              { name: 'issueDate', label: 'Issue date', type: 'date' },
              { name: 'expectedReturnDate', label: 'Expected return', type: 'date' },
              { name: 'transportMode', label: 'Transport mode' },
              { name: 'vehicleNumber', label: 'Vehicle number' },
              { name: 'driverName', label: 'Driver name' },
              { name: 'driverPhone', label: 'Driver phone' },
              { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
            ]}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Challans" value={formatNumber(issues.total)} />
        <StatCard label="Awaiting acknowledgement" value={formatNumber(unacknowledged)} tone="warning" />
        <StatCard
          label="Weight issued"
          value={`${formatNumber(issues.data.reduce((sum, issue) => sum + issue.totalIssueWeightKg, 0), 1)} kg`}
        />
        <StatCard
          label="Shortage reported"
          value={`${formatNumber(shortage, 3)} kg`}
          tone={shortage > 0 ? 'destructive' : 'default'}
        />
      </div>

      <SearchFilters
        searchPlaceholder="Search by challan, job or partner…"
        filters={[
          {
            name: 'status',
            label: 'Status',
            options: optionsFrom(['ISSUED', 'IN_TRANSIT', 'ACKNOWLEDGED', 'SHORT_RECEIVED', 'DAMAGED', 'RETURNED']),
          },
          { name: 'partnerId', label: 'Partner', options: partners },
        ]}
      />

      <DataTable
        columns={columns}
        rows={issues.data}
        rowHref={(row) => `/app/materials/issues/${row.id}`}
        empty={{ title: 'No material issues', description: 'Issue material against an accepted job.' }}
      />

      <PaginationControls page={issues.page} totalPages={issues.totalPages} total={issues.total} />
    </div>
  );
}
