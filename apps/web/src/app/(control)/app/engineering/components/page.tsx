import { CRITICALITY_CLASSES, INSPECTION_LEVELS, PROCESS_TYPES } from '@gridx/shared';

import { createComponentAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { DataTable, type Column } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { PaginationControls } from '@/components/app/pagination-controls';
import { SearchFilters } from '@/components/app/search-filters';
import { StatCard } from '@/components/app/stat-card';
import { Badge } from '@/components/ui/badge';
import { formatNumber, humanise } from '@/lib/format';
import { optionsFrom } from '@/lib/options';
import { readPage, readParam, type SearchParams } from '@/lib/query';
import { companyOptions } from '@/lib/reference';
import { apiGet } from '@/lib/session';
import { emptyPage, type ComponentRow, type Paginated, type ProductRow } from '@/lib/types';

export const metadata = { title: 'Components · GRID-X' };

export default async function ComponentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const page = readPage(searchParams);
  const query = new URLSearchParams({ page: String(page), pageSize: '25' });
  for (const key of ['search', 'criticality', 'primaryProcess']) {
    const value = readParam(searchParams, key);
    if (value) query.set(key, value);
  }

  const [components, companies, products] = await Promise.all([
    apiGet<Paginated<ComponentRow>>(`/components?${query.toString()}`, emptyPage<ComponentRow>()),
    companyOptions(),
    apiGet<ProductRow[]>('/products', []),
  ]);

  const classA = components.data.filter((row) => row.criticality === 'CLASS_A').length;

  const columns: Column<ComponentRow>[] = [
    {
      key: 'component',
      header: 'Component',
      render: (row) => (
        <span className="block">
          <span className="block font-medium">{row.name}</span>
          <span className="block text-xs text-muted-foreground">{row.componentCode}</span>
        </span>
      ),
    },
    { key: 'process', header: 'Primary process', render: (row) => humanise(row.primaryProcess) },
    {
      key: 'criticality',
      header: 'Criticality',
      render: (row) => (
        <Badge variant={row.criticality === 'CLASS_A' ? 'destructive' : 'outline'}>
          {humanise(row.criticality)}
        </Badge>
      ),
    },
    { key: 'inspection', header: 'Inspection level', render: (row) => humanise(row.inspectionLevel) },
    {
      key: 'weight',
      header: 'Weight (kg)',
      align: 'right',
      render: (row) => (row.theoreticalWeightKg === null ? '—' : formatNumber(row.theoreticalWeightKg, 3)),
    },
    {
      key: 'rate',
      header: 'Std rate',
      align: 'right',
      render: (row) => (row.standardConversionRate === null ? '—' : formatNumber(row.standardConversionRate, 2)),
    },
    {
      key: 'partners',
      header: 'Approved partners',
      align: 'right',
      render: (row) => formatNumber(row._count?.approvedPartners ?? 0),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon="Ruler"
        title="Components"
        description="Outsourced component master: process route, criticality class, inspection level and approved partners."
        actions={
          <ActionDialog
            title="Create component"
            triggerLabel="New component"
            action={createComponentAction}
            hidden={{ companyId: companies[0]?.value }}
            fields={[
              { name: 'componentCode', label: 'Component code', required: true },
              { name: 'name', label: 'Name', required: true },
              { name: 'productId', label: 'Product', type: 'select', options: products.map((product) => ({ value: product.id, label: `${product.code} — ${product.name}` })) },
              { name: 'drawingNumber', label: 'Drawing number' },
              { name: 'primaryProcess', label: 'Primary process', type: 'select', required: true, options: optionsFrom(PROCESS_TYPES) },
              { name: 'criticality', label: 'Criticality', type: 'select', options: optionsFrom(CRITICALITY_CLASSES), defaultValue: 'CLASS_C' },
              { name: 'inspectionLevel', label: 'Inspection level', type: 'select', options: optionsFrom(INSPECTION_LEVELS), defaultValue: 'LEVEL_2_SAMPLING' },
              { name: 'materialGrade', label: 'Material grade' },
              { name: 'theoreticalWeightKg', label: 'Theoretical weight (kg)', type: 'number', step: '0.001' },
              { name: 'standardCycleTimeMinutes', label: 'Cycle time (min)', type: 'number', step: '0.1' },
              { name: 'standardConversionRate', label: 'Standard conversion rate', type: 'number', step: '0.01' },
              { name: 'scrapAllowancePercent', label: 'Scrap allowance (%)', type: 'number', defaultValue: '5' },
              { name: 'outsourcingEligibilityScore', label: 'Outsourcing eligibility (0-100)', type: 'number', defaultValue: '50' },
              { name: 'packagingRequirement', label: 'Packaging requirement', type: 'textarea', span: 2 },
            ]}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Components" value={formatNumber(components.total)} />
        <StatCard label="Class A on this page" value={formatNumber(classA)} tone="warning" hint="need authorisation to outsource" />
        <StatCard label="Products" value={formatNumber(products.length)} />
        <StatCard
          label="Drawings linked"
          value={formatNumber(components.data.reduce((sum, row) => sum + (row._count?.drawings ?? 0), 0))}
        />
      </div>

      <SearchFilters
        searchPlaceholder="Search components by code or name…"
        filters={[
          { name: 'criticality', label: 'Criticality', options: optionsFrom(CRITICALITY_CLASSES) },
          { name: 'primaryProcess', label: 'Process', options: optionsFrom(PROCESS_TYPES) },
        ]}
      />

      <DataTable
        columns={columns}
        rows={components.data}
        rowHref={(row) => `/app/engineering/components/${row.id}`}
        empty={{ title: 'No components yet', description: 'Create the components you outsource to the partner network.' }}
      />

      <PaginationControls page={components.page} totalPages={components.totalPages} total={components.total} />
    </div>
  );
}
