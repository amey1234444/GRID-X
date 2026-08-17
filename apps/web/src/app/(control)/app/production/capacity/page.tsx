import { PROCESS_TYPES } from '@gridx/shared';

import { declareCapacityAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { DataTable } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { StatCard } from '@/components/app/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, formatNumber, humanise } from '@/lib/format';
import { optionsFrom } from '@/lib/options';
import { partnerOptions } from '@/lib/reference';
import { apiGet } from '@/lib/session';
import type { CapacityDeclarationRow, CapacityHeatmapCell } from '@/lib/types';

export const metadata = { title: 'Capacity · GRID-X' };

export default async function CapacityPage(): Promise<React.JSX.Element> {
  const [declarations, heatmap, partners] = await Promise.all([
    apiGet<CapacityDeclarationRow[]>('/capacity/declarations', []),
    apiGet<CapacityHeatmapCell[]>('/capacity/heatmap', []),
    partnerOptions(),
  ]);

  const available = heatmap.reduce((sum, row) => sum + row.availableHours, 0);
  const committed = heatmap.reduce((sum, row) => sum + row.committedHours, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Capacity planning"
        description="Capacity declared by each partner per process versus the hours GRID-X has already committed."
        actions={
          <ActionDialog
            title="Declare capacity"
            description="Capacity is declared for a period per process; committed hours come from allocated jobs."
            triggerLabel="Declare capacity"
            action={declareCapacityAction}
            fields={[
              { name: 'partnerId', label: 'Partner', type: 'select', required: true, options: partners, span: 2 },
              { name: 'processCode', label: 'Process', type: 'select', required: true, options: optionsFrom(PROCESS_TYPES) },
              {
                name: 'periodType',
                label: 'Period type',
                type: 'select',
                options: optionsFrom(['WEEKLY', 'MONTHLY']),
                defaultValue: 'WEEKLY',
              },
              { name: 'periodStart', label: 'Period start', type: 'date', required: true },
              { name: 'periodEnd', label: 'Period end', type: 'date', required: true },
              { name: 'availableHours', label: 'Available hours', type: 'number', required: true },
              { name: 'availableWorkers', label: 'Available workers', type: 'number', defaultValue: '0' },
              { name: 'availableMachines', label: 'Available machines', type: 'number', defaultValue: '0' },
              { name: 'maintenanceShutdownHours', label: 'Maintenance shutdown (h)', type: 'number', defaultValue: '0' },
              { name: 'expectedBottleneck', label: 'Expected bottleneck', type: 'textarea', span: 2 },
            ]}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Available hours" value={formatNumber(available)} hint="next 8 weeks" />
        <StatCard label="Committed hours" value={formatNumber(committed)} />
        <StatCard
          label="Utilisation"
          value={available === 0 ? '—' : `${formatNumber((committed / available) * 100, 1)}%`}
          tone={available > 0 && committed / available > 0.9 ? 'warning' : 'default'}
        />
        <StatCard label="Partners declaring" value={formatNumber(new Set(heatmap.map((row) => row.partnerId)).size)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Capacity heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'partner', header: 'Partner', render: (row: CapacityHeatmapCell) => row.businessName },
              { key: 'process', header: 'Process', render: (row: CapacityHeatmapCell) => humanise(row.processCode) },
              {
                key: 'period',
                header: 'Period',
                render: (row: CapacityHeatmapCell) => `${formatDate(row.periodStart)} → ${formatDate(row.periodEnd)}`,
              },
              {
                key: 'available',
                header: 'Available',
                align: 'right',
                render: (row: CapacityHeatmapCell) => formatNumber(row.availableHours),
              },
              {
                key: 'committed',
                header: 'Committed',
                align: 'right',
                render: (row: CapacityHeatmapCell) => formatNumber(row.committedHours),
              },
              { key: 'free', header: 'Free', align: 'right', render: (row: CapacityHeatmapCell) => formatNumber(row.freeHours) },
              {
                key: 'utilisation',
                header: 'Utilisation',
                align: 'right',
                render: (row: CapacityHeatmapCell) => (
                  <span
                    className={
                      row.utilisationPercent > 95
                        ? 'font-medium text-destructive'
                        : row.utilisationPercent > 80
                          ? 'font-medium text-warning'
                          : undefined
                    }
                  >
                    {formatNumber(row.utilisationPercent, 1)}%
                  </span>
                ),
              },
            ]}
            rows={heatmap}
            empty={{ title: 'No capacity declared', description: 'Ask partners to declare capacity per process and period.' }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Declarations</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'partner', header: 'Partner', render: (row: CapacityDeclarationRow) => row.partner.businessName },
              { key: 'process', header: 'Process', render: (row: CapacityDeclarationRow) => row.process.name },
              {
                key: 'period',
                header: 'Period',
                render: (row: CapacityDeclarationRow) =>
                  `${humanise(row.periodType)} · ${formatDate(row.periodStart)} → ${formatDate(row.periodEnd)}`,
              },
              {
                key: 'available',
                header: 'Available (h)',
                align: 'right',
                render: (row: CapacityDeclarationRow) => formatNumber(row.availableHours),
              },
              {
                key: 'committed',
                header: 'Committed (h)',
                align: 'right',
                render: (row: CapacityDeclarationRow) => formatNumber(row.committedHours),
              },
              {
                key: 'people',
                header: 'Workers / machines',
                align: 'right',
                render: (row: CapacityDeclarationRow) =>
                  `${formatNumber(row.availableWorkers)} / ${formatNumber(row.availableMachines)}`,
              },
              {
                key: 'bottleneck',
                header: 'Bottleneck',
                render: (row: CapacityDeclarationRow) => row.expectedBottleneck ?? '—',
              },
            ]}
            rows={declarations}
            empty={{ title: 'No declarations yet' }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
