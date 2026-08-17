import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SHIPMENT_STATUSES } from '@gridx/shared';

import { recordProofOfDeliveryAction, updateShipmentStatusAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { DataTable } from '@/components/app/data-table';
import { DetailList } from '@/components/app/detail-list';
import { EmptyState } from '@/components/app/empty-state';
import { PageHeader } from '@/components/app/page-header';
import { StatusBadge } from '@/components/app/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDateTime, formatNumber, humanise } from '@/lib/format';
import { optionsFrom } from '@/lib/options';
import { apiFetch } from '@/lib/session';

interface ShipmentDetail {
  id: string;
  shipmentNumber: string;
  direction: string;
  status: string;
  pickupLocation: string;
  deliveryLocation: string;
  materialType: string | null;
  weightKg: number;
  transportCost: number;
  driverName: string | null;
  driverPhone: string | null;
  plannedPickupAt: string;
  actualPickupAt: string | null;
  expectedDeliveryAt: string | null;
  actualDeliveryAt: string | null;
  remarks: string | null;
  vehicle: { id: string; registrationNo: string; vehicleType: string } | null;
  fromPartner: { id: string; businessName: string; city: string; phone: string } | null;
  toPartner: { id: string; businessName: string; city: string; phone: string } | null;
  items: {
    id: string;
    description: string;
    quantity: number;
    weightKg: number;
    job: { id: string; jobNumber: string } | null;
  }[];
  proofOfDelivery: {
    id: string;
    receivedBy: string;
    receivedAt: string;
    remarks: string | null;
  } | null;
}

export default async function ShipmentDetailPage({
  params,
}: {
  params: { id: string };
}): Promise<React.JSX.Element> {
  const result = await apiFetch<ShipmentDetail>(`/logistics/shipments/${params.id}`);
  const shipment = result.data;
  if (!shipment) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={shipment.shipmentNumber}
        description={`${humanise(shipment.direction)} · ${shipment.pickupLocation} → ${shipment.deliveryLocation}`}
        actions={
          <>
            <ActionDialog
              title="Update status"
              triggerLabel="Update status"
              triggerVariant="outline"
              action={updateShipmentStatusAction}
              hidden={{ shipmentId: shipment.id }}
              fields={[
                {
                  name: 'status',
                  label: 'Status',
                  type: 'select',
                  required: true,
                  options: optionsFrom(SHIPMENT_STATUSES),
                  defaultValue: shipment.status,
                  span: 2,
                },
                { name: 'actualPickupAt', label: 'Actual pickup', type: 'datetime-local' },
                { name: 'actualDeliveryAt', label: 'Actual delivery', type: 'datetime-local' },
                { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
              ]}
            />
            {shipment.proofOfDelivery ? null : (
              <ActionDialog
                title="Record proof of delivery"
                triggerLabel="Proof of delivery"
                action={recordProofOfDeliveryAction}
                hidden={{ shipmentId: shipment.id }}
                fields={[
                  { name: 'receivedBy', label: 'Received by', required: true, span: 2 },
                  { name: 'receivedAt', label: 'Received at', type: 'datetime-local' },
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
            )}
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            Movement
            <StatusBadge status={shipment.status} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList
            columns={3}
            items={[
              {
                label: 'From',
                value: shipment.fromPartner ? (
                  <Link
                    href={`/app/partners/${shipment.fromPartner.id}`}
                    className="text-primary hover:underline"
                  >
                    {shipment.fromPartner.businessName}
                  </Link>
                ) : (
                  shipment.pickupLocation
                ),
              },
              {
                label: 'To',
                value: shipment.toPartner ? (
                  <Link
                    href={`/app/partners/${shipment.toPartner.id}`}
                    className="text-primary hover:underline"
                  >
                    {shipment.toPartner.businessName}
                  </Link>
                ) : (
                  shipment.deliveryLocation
                ),
              },
              { label: 'Material', value: shipment.materialType ?? '—' },
              { label: 'Weight', value: `${formatNumber(shipment.weightKg, 3)} kg` },
              { label: 'Freight cost', value: formatCurrency(shipment.transportCost) },
              {
                label: 'Vehicle',
                value: shipment.vehicle
                  ? `${shipment.vehicle.registrationNo} (${shipment.vehicle.vehicleType})`
                  : '—',
              },
              {
                label: 'Driver',
                value: shipment.driverName
                  ? `${shipment.driverName}${shipment.driverPhone ? ` · ${shipment.driverPhone}` : ''}`
                  : '—',
              },
              { label: 'Planned pickup', value: formatDateTime(shipment.plannedPickupAt) },
              { label: 'Actual pickup', value: formatDateTime(shipment.actualPickupAt) },
              { label: 'Expected delivery', value: formatDateTime(shipment.expectedDeliveryAt) },
              { label: 'Actual delivery', value: formatDateTime(shipment.actualDeliveryAt) },
              { label: 'Remarks', value: shipment.remarks ?? '—' },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contents</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              {
                key: 'description',
                header: 'Description',
                render: (row: ShipmentDetail['items'][number]) => row.description,
              },
              {
                key: 'job',
                header: 'Job',
                render: (row: ShipmentDetail['items'][number]) =>
                  row.job ? (
                    <Link
                      href={`/app/production/jobs/${row.job.id}`}
                      className="text-primary hover:underline"
                    >
                      {row.job.jobNumber}
                    </Link>
                  ) : (
                    '—'
                  ),
              },
              {
                key: 'quantity',
                header: 'Quantity',
                align: 'right',
                render: (row: ShipmentDetail['items'][number]) => formatNumber(row.quantity),
              },
              {
                key: 'weight',
                header: 'Weight',
                align: 'right',
                render: (row: ShipmentDetail['items'][number]) => `${formatNumber(row.weightKg, 3)} kg`,
              },
            ]}
            rows={shipment.items}
            empty={{
              title: 'No line items',
              description: 'Add contents when creating a shipment to link it to jobs.',
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Proof of delivery</CardTitle>
        </CardHeader>
        <CardContent>
          {shipment.proofOfDelivery ? (
            <DetailList
              columns={3}
              items={[
                { label: 'Received by', value: shipment.proofOfDelivery.receivedBy },
                { label: 'Received at', value: formatDateTime(shipment.proofOfDelivery.receivedAt) },
                { label: 'Remarks', value: shipment.proofOfDelivery.remarks ?? '—' },
              ]}
            />
          ) : (
            <EmptyState
              title="Not delivered yet"
              description="Record proof of delivery when the consignment is received."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
