import { INSPECTION_TYPES } from '@gridx/shared';

import { createInspectionPlanAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { DataTable } from '@/components/app/data-table';
import { EmptyState } from '@/components/app/empty-state';
import { PageHeader } from '@/components/app/page-header';
import { StatusBadge } from '@/components/app/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { humanise } from '@/lib/format';
import { optionsFrom } from '@/lib/options';
import { companyOptions, componentOptions } from '@/lib/reference';
import { apiGet } from '@/lib/session';
import type { InspectionPlanRow } from '@/lib/types';

export const metadata = { title: 'Inspection plans · GRID-X' };

export default async function InspectionPlansPage(): Promise<React.JSX.Element> {
  const [plans, companies, components] = await Promise.all([
    apiGet<InspectionPlanRow[]>('/quality/plans', []),
    companyOptions(),
    componentOptions(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inspection plans"
        description="Component-wise characteristics, specifications and instruments used for first article and final inspection."
        actions={
          <ActionDialog
            title="Create inspection plan"
            description="Start with the first characteristic; more can be added to the plan later."
            triggerLabel="New plan"
            action={createInspectionPlanAction}
            hidden={{ companyId: companies[0]?.value }}
            fields={[
              { name: 'componentId', label: 'Component', type: 'select', required: true, options: components, span: 2 },
              { name: 'name', label: 'Plan name', required: true },
              { name: 'inspectionType', label: 'Inspection type', type: 'select', options: optionsFrom(INSPECTION_TYPES), defaultValue: 'FINAL' },
              { name: 'samplingPlan', label: 'Sampling plan', placeholder: 'e.g. ISO 2859-1 Level II AQL 1.0' },
              { name: 'characteristic', label: 'First characteristic', required: true },
              { name: 'specification', label: 'Specification', required: true, placeholder: '25.00 ±0.05' },
              { name: 'unit', label: 'Unit', placeholder: 'mm' },
              { name: 'measuringInstrument', label: 'Instrument', placeholder: 'Vernier caliper' },
              { name: 'isCritical', label: 'Critical characteristic', type: 'checkbox' },
            ]}
          />
        }
      />

      {plans.length === 0 ? (
        <EmptyState
          title="No inspection plans"
          description="Every Class A and Class B component should have an inspection plan before allocation."
        />
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => (
            <Card key={plan.id}>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-3">
                  {plan.name}
                  <StatusBadge status={plan.isActive ? 'ACTIVE' : 'INACTIVE'} />
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {plan.component.componentCode} · {humanise(plan.inspectionType)} · v{plan.version}
                  {plan.samplingPlan ? ` · ${plan.samplingPlan}` : ''}
                </p>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'seq', header: '#', render: (row: InspectionPlanRow['characteristics'][number]) => String(row.sequence) },
                    {
                      key: 'characteristic',
                      header: 'Characteristic',
                      render: (row: InspectionPlanRow['characteristics'][number]) => (
                        <span className="font-medium">
                          {row.characteristic}
                          {row.isCritical ? <span className="ml-2 text-xs text-destructive">critical</span> : null}
                        </span>
                      ),
                    },
                    {
                      key: 'spec',
                      header: 'Specification',
                      render: (row: InspectionPlanRow['characteristics'][number]) =>
                        `${row.specification}${row.unit ? ` ${row.unit}` : ''}`,
                    },
                    {
                      key: 'instrument',
                      header: 'Instrument',
                      render: (row: InspectionPlanRow['characteristics'][number]) => row.measuringInstrument ?? '—',
                    },
                  ]}
                  rows={plan.characteristics}
                  empty={{ title: 'No characteristics' }}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
