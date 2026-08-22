import { createItemAction, createProductAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { DataTable } from '@/components/app/data-table';
import { ImportPanel } from '@/components/app/import-panel';
import { PageHeader } from '@/components/app/page-header';
import { StatusBadge } from '@/components/app/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@/lib/format';
import { companyOptions } from '@/lib/reference';
import { apiGet } from '@/lib/session';
import { emptyPage, type ItemRow, type Paginated, type ProcessRow, type ProductRow } from '@/lib/types';

export const metadata = { title: 'Masters · GRID-X' };

export default async function MastersPage(): Promise<React.JSX.Element> {
  const [items, products, processes, companies] = await Promise.all([
    apiGet<Paginated<ItemRow>>('/items?pageSize=100', emptyPage<ItemRow>()),
    apiGet<ProductRow[]>('/products', []),
    apiGet<ProcessRow[]>('/processes', []),
    companyOptions(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Engineering masters"
        description="Raw material items, finished products and the process catalogue with standard hourly rates."
      />

      <ImportPanel
        targets={[
          {
            entity: 'components',
            title: 'Components',
            description:
              'Component code, name, primary process, criticality and standard rates. Existing codes are updated.',
          },
          {
            entity: 'partner-rates',
            title: 'Partner rates',
            description:
              'Conversion rate per partner and component. The current rate is closed off and kept as history.',
          },
          {
            entity: 'approved-partners',
            title: 'Approved partner list',
            description:
              'Which partners may be allocated which components. A partner without the matching approved capability is rejected.',
          },
        ]}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Items</CardTitle>
          <ActionDialog
            title="Create item"
            triggerLabel="New item"
            triggerSize="sm"
            action={createItemAction}
            fields={[
              { name: 'code', label: 'Item code', required: true },
              { name: 'name', label: 'Name', required: true },
              { name: 'uom', label: 'Unit of measure', defaultValue: 'KG' },
              { name: 'materialGrade', label: 'Material grade' },
              { name: 'unitWeightKg', label: 'Unit weight (kg)', type: 'number', step: '0.001' },
              { name: 'standardRate', label: 'Standard rate', type: 'number', step: '0.01' },
            ]}
          />
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'code', header: 'Code', render: (row: ItemRow) => row.code },
              { key: 'name', header: 'Name', render: (row: ItemRow) => row.name },
              { key: 'uom', header: 'UOM', render: (row: ItemRow) => row.uom },
              { key: 'grade', header: 'Grade', render: (row: ItemRow) => row.materialGrade ?? '—' },
              {
                key: 'weight',
                header: 'Unit weight (kg)',
                align: 'right',
                render: (row: ItemRow) => (row.unitWeightKg === null ? '—' : formatNumber(row.unitWeightKg, 3)),
              },
              {
                key: 'rate',
                header: 'Standard rate',
                align: 'right',
                render: (row: ItemRow) => (row.standardRate === null ? '—' : formatNumber(row.standardRate, 2)),
              },
            ]}
            rows={items.data}
            empty={{ title: 'No items' }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Products</CardTitle>
          <ActionDialog
            title="Create product"
            triggerLabel="New product"
            triggerSize="sm"
            action={createProductAction}
            hidden={{ companyId: companies[0]?.value }}
            fields={[
              { name: 'code', label: 'Product code', required: true },
              { name: 'name', label: 'Name', required: true },
              { name: 'description', label: 'Description', type: 'textarea', span: 2 },
            ]}
          />
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'code', header: 'Code', render: (row: ProductRow) => row.code },
              { key: 'name', header: 'Name', render: (row: ProductRow) => row.name },
              { key: 'description', header: 'Description', render: (row: ProductRow) => row.description ?? '—' },
              {
                key: 'status',
                header: 'Status',
                render: (row: ProductRow) => <StatusBadge status={row.isActive ? 'ACTIVE' : 'INACTIVE'} />,
              },
            ]}
            rows={products}
            empty={{ title: 'No products' }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Processes</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'code', header: 'Code', render: (row: ProcessRow) => row.code },
              { key: 'name', header: 'Name', render: (row: ProcessRow) => row.name },
              {
                key: 'rate',
                header: 'Standard rate / hour',
                align: 'right',
                render: (row: ProcessRow) =>
                  row.standardRatePerHour === null ? '—' : formatNumber(row.standardRatePerHour, 2),
              },
            ]}
            rows={processes}
            empty={{ title: 'No processes' }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
