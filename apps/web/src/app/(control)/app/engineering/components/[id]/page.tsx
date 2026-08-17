import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CRITICALITY_CLASSES, INSPECTION_LEVELS, PROCESS_TYPES } from '@gridx/shared';

import {
  addComponentItemAction,
  addComponentProcessAction,
  approvePartnerComponentAction,
  removeApprovedPartnerAction,
  removeComponentItemAction,
  removeComponentProcessAction,
  updateComponentAction,
} from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { DataTable } from '@/components/app/data-table';
import { DetailList } from '@/components/app/detail-list';
import { PageHeader } from '@/components/app/page-header';
import { StatusBadge } from '@/components/app/status-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber, humanise } from '@/lib/format';
import { optionsFrom } from '@/lib/options';
import { itemOptions, partnerOptions } from '@/lib/reference';
import { apiFetch } from '@/lib/session';
import type { ComponentDetail } from '@/lib/types';

export default async function ComponentDetailPage({
  params,
}: {
  params: { id: string };
}): Promise<React.JSX.Element> {
  const [result, partners, items] = await Promise.all([
    apiFetch<ComponentDetail>(`/components/${params.id}`),
    partnerOptions(),
    itemOptions(),
  ]);
  const component = result.data;
  if (!component) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={component.name}
        description={`${component.componentCode}${component.product ? ` · ${component.product.name}` : ''}`}
        actions={
          <>
            <ActionDialog
              title="Edit component"
              description="Only the fields you fill in are changed."
              triggerLabel="Edit"
              triggerVariant="outline"
              action={updateComponentAction}
              hidden={{ componentId: component.id }}
              fields={[
                { name: 'componentCode', label: 'Component code', defaultValue: component.componentCode },
                { name: 'name', label: 'Name', defaultValue: component.name },
                {
                  name: 'primaryProcess',
                  label: 'Primary process',
                  type: 'select',
                  options: optionsFrom(PROCESS_TYPES),
                  defaultValue: component.primaryProcess,
                },
                {
                  name: 'criticality',
                  label: 'Criticality',
                  type: 'select',
                  options: optionsFrom(CRITICALITY_CLASSES),
                  defaultValue: component.criticality,
                },
                {
                  name: 'inspectionLevel',
                  label: 'Inspection level',
                  type: 'select',
                  options: optionsFrom(INSPECTION_LEVELS),
                  defaultValue: component.inspectionLevel,
                },
                { name: 'materialGrade', label: 'Material grade', defaultValue: component.materialGrade ?? undefined },
                {
                  name: 'theoreticalWeightKg',
                  label: 'Theoretical weight (kg)',
                  type: 'number',
                  step: '0.001',
                  defaultValue:
                    component.theoreticalWeightKg === null ? undefined : String(component.theoreticalWeightKg),
                },
                {
                  name: 'standardCycleTimeMinutes',
                  label: 'Cycle time (min)',
                  type: 'number',
                  step: '0.1',
                  defaultValue:
                    component.standardCycleTimeMinutes === null
                      ? undefined
                      : String(component.standardCycleTimeMinutes),
                },
                {
                  name: 'standardConversionRate',
                  label: 'Standard conversion rate',
                  type: 'number',
                  step: '0.01',
                  defaultValue:
                    component.standardConversionRate === null
                      ? undefined
                      : String(component.standardConversionRate),
                },
                {
                  name: 'scrapAllowancePercent',
                  label: 'Scrap allowance (%)',
                  type: 'number',
                  step: '0.1',
                  defaultValue: String(component.scrapAllowancePercent),
                },
                {
                  name: 'outsourcingEligibilityScore',
                  label: 'Outsourcing eligibility',
                  type: 'number',
                  defaultValue: String(component.outsourcingEligibilityScore),
                },
                {
                  name: 'packagingRequirement',
                  label: 'Packaging requirement',
                  type: 'textarea',
                  defaultValue: component.packagingRequirement ?? undefined,
                  span: 2,
                },
              ]}
            />
            <ActionDialog
              title="Add material line"
              description="Bill of material lines drive the theoretical material quantity for each job."
              triggerLabel="Add material"
              triggerVariant="outline"
              action={addComponentItemAction}
              hidden={{ componentId: component.id }}
              fields={[
                { name: 'itemId', label: 'Item', type: 'select', required: true, options: items, span: 2 },
                {
                  name: 'quantityPerUnit',
                  label: 'Quantity per unit',
                  type: 'number',
                  step: '0.001',
                  required: true,
                },
                { name: 'uom', label: 'UOM', defaultValue: 'KG' },
              ]}
            />
            <ActionDialog
              title="Approve a partner"
              description="Only approved partner–component pairs can be allocated jobs."
              triggerLabel="Approve partner"
              action={approvePartnerComponentAction}
              hidden={{ componentId: component.id }}
              fields={[
                { name: 'partnerId', label: 'Partner', type: 'select', required: true, options: partners, span: 2 },
                { name: 'firstArticleDone', label: 'First article approved', type: 'checkbox' },
                { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
              ]}
            />
            <ActionDialog
              title="Add process step"
              triggerLabel="Add process"
              triggerVariant="outline"
              action={addComponentProcessAction}
              hidden={{ componentId: component.id }}
              fields={[
                { name: 'processCode', label: 'Process', type: 'select', required: true, options: optionsFrom(PROCESS_TYPES) },
                { name: 'sequence', label: 'Sequence', type: 'number', defaultValue: '1' },
                { name: 'cycleTimeMinutes', label: 'Cycle time (min)', type: 'number', step: '0.1' },
                { name: 'isOutsourced', label: 'Outsourced', type: 'checkbox', defaultValue: 'on' },
                { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
              ]}
            />
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Engineering data</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList
            columns={3}
            items={[
              {
                label: 'Criticality',
                value: (
                  <Badge variant={component.criticality === 'CLASS_A' ? 'destructive' : 'outline'}>
                    {humanise(component.criticality)}
                  </Badge>
                ),
              },
              { label: 'Inspection level', value: humanise(component.inspectionLevel) },
              { label: 'Primary process', value: humanise(component.primaryProcess) },
              { label: 'Material grade', value: component.materialGrade ?? '—' },
              {
                label: 'Theoretical weight',
                value: component.theoreticalWeightKg ? `${formatNumber(component.theoreticalWeightKg, 3)} kg` : '—',
              },
              {
                label: 'Cycle time',
                value: component.standardCycleTimeMinutes ? `${formatNumber(component.standardCycleTimeMinutes, 1)} min` : '—',
              },
              {
                label: 'Standard conversion rate',
                value: component.standardConversionRate ? formatNumber(component.standardConversionRate, 2) : '—',
              },
              { label: 'Scrap allowance', value: `${formatNumber(component.scrapAllowancePercent, 1)}%` },
              { label: 'Outsourcing eligibility', value: formatNumber(component.outsourcingEligibilityScore) },
              { label: 'Packaging', value: component.packagingRequirement ?? '—' },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Process route</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'seq', header: '#', render: (row: ComponentDetail['processes'][number]) => formatNumber(row.sequence) },
              { key: 'process', header: 'Process', render: (row: ComponentDetail['processes'][number]) => row.process.name },
              {
                key: 'cycle',
                header: 'Cycle time (min)',
                align: 'right',
                render: (row: ComponentDetail['processes'][number]) =>
                  row.cycleTimeMinutes === null ? '—' : formatNumber(row.cycleTimeMinutes, 1),
              },
              {
                key: 'outsourced',
                header: 'Outsourced',
                render: (row: ComponentDetail['processes'][number]) => (row.isOutsourced ? 'Yes' : 'In-house'),
              },
              {
                key: 'actions',
                header: '',
                render: (row: ComponentDetail['processes'][number]) => (
                  <ActionDialog
                    title="Remove process step"
                    triggerLabel="Remove"
                    triggerSize="sm"
                    triggerVariant="ghost"
                    submitLabel="Remove"
                    action={removeComponentProcessAction}
                    hidden={{ componentId: component.id, componentProcessId: row.id }}
                    fields={[]}
                  />
                ),
              },
            ]}
            rows={component.processes}
            empty={{ title: 'No process route defined' }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bill of material</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              {
                key: 'item',
                header: 'Item',
                render: (row: ComponentDetail['items'][number]) => `${row.item.code} — ${row.item.name}`,
              },
              {
                key: 'qty',
                header: 'Qty per unit',
                align: 'right',
                render: (row: ComponentDetail['items'][number]) => `${formatNumber(row.quantityPerUnit, 3)} ${row.uom}`,
              },
              {
                key: 'actions',
                header: '',
                render: (row: ComponentDetail['items'][number]) => (
                  <ActionDialog
                    title="Remove material line"
                    triggerLabel="Remove"
                    triggerSize="sm"
                    triggerVariant="ghost"
                    submitLabel="Remove"
                    action={removeComponentItemAction}
                    hidden={{ componentId: component.id, componentItemId: row.id }}
                    fields={[]}
                  />
                ),
              },
            ]}
            rows={component.items}
            empty={{ title: 'No material lines', description: 'Add items so material issue quantities can be computed.' }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approved partners</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              {
                key: 'partner',
                header: 'Partner',
                render: (row: ComponentDetail['approvedPartners'][number]) => (
                  <Link href={`/app/partners/${row.partner.id}`} className="font-medium text-primary hover:underline">
                    {row.partner.businessName}
                  </Link>
                ),
              },
              {
                key: 'status',
                header: 'Approval',
                render: (row: ComponentDetail['approvedPartners'][number]) => <StatusBadge status={row.partner.approvalStatus} />,
              },
              {
                key: 'fa',
                header: 'First article',
                render: (row: ComponentDetail['approvedPartners'][number]) => (
                  <StatusBadge status={row.firstArticleDone ? 'APPROVED' : 'PENDING'} />
                ),
              },
              {
                key: 'remarks',
                header: 'Remarks',
                render: (row: ComponentDetail['approvedPartners'][number]) => row.remarks ?? '—',
              },
              {
                key: 'actions',
                header: '',
                render: (row: ComponentDetail['approvedPartners'][number]) => (
                  <ActionDialog
                    title="Withdraw approval"
                    description="The partner can no longer be allocated jobs for this component."
                    triggerLabel="Withdraw"
                    triggerSize="sm"
                    triggerVariant="ghost"
                    submitLabel="Withdraw"
                    action={removeApprovedPartnerAction}
                    hidden={{ componentId: component.id, approvalId: row.id }}
                    fields={[]}
                  />
                ),
              },
            ]}
            rows={component.approvedPartners}
            empty={{ title: 'No approved partners', description: 'Approve at least one partner before allocating jobs.' }}
          />
        </CardContent>
      </Card>

      {component.drawings.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Drawings</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {component.drawings.map((drawing) => (
              <Link
                key={drawing.id}
                href={`/app/engineering/drawings/${drawing.id}`}
                className="rounded-full border px-3 py-1 text-xs hover:bg-secondary"
              >
                {drawing.drawingNumber} · {drawing.title}
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
