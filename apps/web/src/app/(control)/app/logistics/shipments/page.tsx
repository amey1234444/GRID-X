import { SHIPMENT_DIRECTIONS, SHIPMENT_STATUSES } from '@gridx/shared';

import { createShipmentAction, recordProofOfDeliveryAction, updateShipmentStatusAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { DataTable, type Column } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { PaginationControls } from '@/components/app/pagination-controls';
import { SearchFilters } from '@/components/app/search-filters';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { formatCurrency, formatDateTime, formatNumber, humanise } from '@/lib/format';
import { optionsFrom } from '@/lib/options';
import { readPage, readParam, type SearchParams } from '@/lib/query';
import { defaultCompanyId, jobOptions, partnerOptions, vehicleOptions } from '@/lib/reference';
import { apiGet } from '@/lib/session';
import { emptyPage, type Paginated, type ShipmentRow } from '@/lib/types';

export const metadata = { title: 'Shipments · GRID-X' };

export default async function ShipmentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const page = readPage(searchParams);
  const query = new URLSearchParams({ page: String(page), pageSize: '25' });
  for (const key of ['search', 'status', 'direction']) {
    const value = readParam(searchParams, key);
    if (value) query.set(key, value);
  }

  const [shipments, partners, vehicles, jobs, companyId] = await Promise.all([
    apiGet<Paginated<ShipmentRow>>(`/logistics/shipments?${query.toString()}`, emptyPage<ShipmentRow>()),
    partnerOptions(),
    vehicleOptions(),
    jobOptions(),
    defaultCompanyId(),
  ]);

  const columns: Column<ShipmentRow>[] = [
    {
      key: 'shipment',
      header: 'Shipment',
      render: (row) => (
        <span className="block">
          <span className="block font-medium">{row.shipmentNumber}</span>
          <span className="block text-xs text-muted-foreground">{humanise(row.direction)}</span>
        </span>
      ),
    },
    {
      key: 'route',
      header: 'Route',
      render: (row) => (
        <span className="block text-sm">
          {row.pickupLocation} → {row.deliveryLocation}
        </span>
      ),
    },
    {
      key: 'partner',
      header: 'Partner',
      render: (row) => row.toPartner?.businessName ?? row.fromPartner?.businessName ?? '—',
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'weight', header: 'Weight (kg)', align: 'right', render: (row) => formatNumber(row.weightKg, 1) },
    { key: 'cost', header: 'Freight', align: 'right', render: (row) => formatCurrency(row.transportCost) },
    { key: 'vehicle', header: 'Vehicle', render: (row) => row.vehicle?.registrationNo ?? '—' },
    { key: 'pickup', header: 'Pickup', render: (row) => formatDateTime(row.actualPickupAt ?? row.plannedPickupAt) },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <span className="flex flex-wrap gap-2">
          <ActionDialog
            title="Update status"
            triggerLabel="Status"
            triggerSize="sm"
            triggerVariant="outline"
            action={updateShipmentStatusAction}
            hidden={{ shipmentId: row.id }}
            fields={[
              { name: 'status', label: 'Status', type: 'select', required: true, options: optionsFrom(SHIPMENT_STATUSES), span: 2 },
              { name: 'actualPickupAt', label: 'Actual pickup', type: 'date' },
              { name: 'actualDeliveryAt', label: 'Actual delivery', type: 'date' },
              { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
            ]}
          />
          {row.actualDeliveryAt === null ? (
            <ActionDialog
              title="Proof of delivery"
              triggerLabel="POD"
              triggerSize="sm"
              triggerVariant="ghost"
              action={recordProofOfDeliveryAction}
              hidden={{ shipmentId: row.id }}
              fields={[
                { name: 'receivedBy', label: 'Received by', required: true, span: 2 },
                { name: 'receivedAt', label: 'Received at', type: 'date' },
                {
                  name: 'signatureFileId',
                  label: 'Signature',
                  type: 'file',
                  category: 'PROOF_OF_DELIVERY',
                  accept: 'image/*',
                },
                {
                  name: 'photoFileId',
                  label: 'Delivery photograph',
                  type: 'file',
                  category: 'PROOF_OF_DELIVERY',
                  accept: 'image/*',
                },
                { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
              ]}
            />
          ) : null}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shipments"
        description="Inbound and outbound movements between OSWAR plants and partners, with freight cost and proof of delivery."
        actions={
          <ActionDialog
            title="Create shipment"
            triggerLabel="New shipment"
            action={createShipmentAction}
            hidden={{ companyId }}
            fields={[
              {
                name: 'direction',
                label: 'Direction',
                type: 'select',
                required: true,
                options: optionsFrom(SHIPMENT_DIRECTIONS),
                span: 2,
              },
              { name: 'fromPartnerId', label: 'From partner', type: 'select', options: partners },
              { name: 'toPartnerId', label: 'To partner', type: 'select', options: partners },
              { name: 'pickupLocation', label: 'Pickup location', required: true },
              { name: 'deliveryLocation', label: 'Delivery location', required: true },
              { name: 'materialType', label: 'Material type' },
              { name: 'weightKg', label: 'Weight (kg)', type: 'number', step: '0.1' },
              { name: 'vehicleId', label: 'Vehicle', type: 'select', options: vehicles },
              { name: 'transportCost', label: 'Freight cost', type: 'number', step: '0.01' },
              { name: 'driverName', label: 'Driver name' },
              { name: 'driverPhone', label: 'Driver phone' },
              { name: 'plannedPickupAt', label: 'Planned pickup', type: 'date', required: true },
              { name: 'expectedDeliveryAt', label: 'Expected delivery', type: 'date' },
              {
                name: 'items',
                label: 'Contents',
                type: 'rows',
                addLabel: 'Add line',
                minRows: 0,
                help: 'Linking a job lets the shipment appear on that job’s timeline.',
                span: 2,
                columns: [
                  { name: 'jobId', label: 'Job', type: 'select', options: jobs },
                  { name: 'description', label: 'Description', required: true },
                  { name: 'quantity', label: 'Quantity', type: 'number' },
                  { name: 'weightKg', label: 'Weight (kg)', type: 'number', step: '0.001' },
                ],
              },
              { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
            ]}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Shipments" value={formatNumber(shipments.total)} />
        <StatCard
          label="In transit"
          value={formatNumber(shipments.data.filter((row) => row.status === 'IN_TRANSIT').length)}
          tone="warning"
        />
        <StatCard label="Weight moved" value={`${formatNumber(shipments.data.reduce((sum, row) => sum + row.weightKg, 0), 1)} kg`} />
        <StatCard
          label="Freight cost"
          value={formatCurrency(shipments.data.reduce((sum, row) => sum + row.transportCost, 0))}
        />
      </div>

      <SearchFilters
        searchPlaceholder="Search by shipment number or location…"
        filters={[
          { name: 'status', label: 'Status', options: optionsFrom(SHIPMENT_STATUSES) },
          { name: 'direction', label: 'Direction', options: optionsFrom(SHIPMENT_DIRECTIONS) },
        ]}
      />

      <DataTable
        columns={columns}
        rows={shipments.data}
        rowHref={(row) => `/app/logistics/shipments/${row.id}`}
        empty={{ title: 'No shipments', description: 'Create a shipment when material or finished parts move.' }}
      />

      <PaginationControls page={shipments.page} totalPages={shipments.totalPages} total={shipments.total} />
    </div>
  );
}
