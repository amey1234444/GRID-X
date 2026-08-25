import { DataTable, type Column } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { PaginationControls } from '@/components/app/pagination-controls';
import { SearchFilters } from '@/components/app/search-filters';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime, formatNumber } from '@/lib/format';
import { readPage, readParam, type SearchParams } from '@/lib/query';
import { partnerOptions } from '@/lib/reference';
import { apiGet } from '@/lib/session';
import { emptyPage, type Paginated, type ShipmentRow } from '@/lib/types';

export const metadata = { title: 'Deliveries · GRID-X' };

/** Collected but not yet signed for, plus anything flagged as running late. */
const IN_FLIGHT = 'PICKED_UP,IN_TRANSIT,DELAYED';

export default async function DeliveriesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const page = readPage(searchParams);
  const showDelivered = readParam(searchParams, 'delivered') === 'true';
  const query = new URLSearchParams({
    page: String(page),
    pageSize: '25',
    statuses: showDelivered ? 'DELIVERED' : IN_FLIGHT,
  });
  const partnerId = readParam(searchParams, 'partnerId');
  if (partnerId) query.set('partnerId', partnerId);
  if (readParam(searchParams, 'overdue') === 'true') query.set('deliveryOverdue', 'true');

  const [shipments, partners] = await Promise.all([
    apiGet<Paginated<ShipmentRow>>(
      `/logistics/shipments?${query.toString()}`,
      emptyPage<ShipmentRow>(),
    ),
    partnerOptions(),
  ]);

  const now = Date.now();
  const late = shipments.data.filter(
    (row) =>
      row.expectedDeliveryAt !== null &&
      row.actualDeliveryAt === null &&
      new Date(row.expectedDeliveryAt).getTime() < now,
  );
  const weight = shipments.data.reduce((sum, row) => sum + row.weightKg, 0);

  const columns: Column<ShipmentRow>[] = [
    {
      key: 'shipment',
      header: 'Shipment',
      render: (row) => (
        <a href={`/app/logistics/shipments/${row.id}`} className="block hover:underline">
          <span className="block font-medium">{row.shipmentNumber}</span>
          <StatusBadge status={row.status} className="scale-90" />
        </a>
      ),
    },
    {
      key: 'to',
      header: 'Deliver to',
      render: (row) => (
        <span className="block">
          <span className="block">{row.toPartner?.businessName ?? row.deliveryLocation}</span>
          <span className="block text-xs text-muted-foreground">{row.deliveryLocation}</span>
        </span>
      ),
    },
    {
      key: 'pickedUp',
      header: 'Collected',
      render: (row) => formatDateTime(row.actualPickupAt),
    },
    {
      key: 'expected',
      header: 'Expected',
      render: (row) => {
        const overdue =
          row.expectedDeliveryAt !== null &&
          row.actualDeliveryAt === null &&
          new Date(row.expectedDeliveryAt).getTime() < now;
        return (
          <span className={overdue ? 'font-medium text-destructive' : undefined}>
            {formatDateTime(row.expectedDeliveryAt)}
          </span>
        );
      },
    },
    {
      key: 'delivered',
      header: 'Delivered',
      render: (row) =>
        row.actualDeliveryAt ? (
          formatDateTime(row.actualDeliveryAt)
        ) : (
          <span className="text-muted-foreground">In transit</span>
        ),
    },
    {
      key: 'weight',
      header: 'Weight',
      align: 'right',
      render: (row) => <span className="tabular-nums">{formatNumber(row.weightKg)} kg</span>,
    },
    {
      key: 'vehicle',
      header: 'Vehicle',
      render: (row) =>
        row.vehicle ? (
          <span className="block">
            <span className="block font-mono text-xs">{row.vehicle.registrationNo}</span>
            <span className="block text-xs text-muted-foreground">{row.driverName ?? '—'}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon="Truck"
        title="Deliveries"
        description="Shipments collected and on their way, and whether they arrived when they were meant to."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={showDelivered ? 'Delivered' : 'In transit'} value={String(shipments.total)} />
        <StatCard label="Running late" value={String(late.length)} hint="Past expected delivery" />
        <StatCard label="Weight moving" value={`${formatNumber(weight)} kg`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {showDelivered ? 'Completed deliveries' : 'On the road'}
          </CardTitle>
          <CardDescription>
            Proof of delivery is captured against the shipment when it is signed for.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchFilters
            searchPlaceholder="Search shipments…"
            filters={[
              { name: 'partnerId', label: 'Partner', options: partners },
              {
                name: 'overdue',
                label: 'Late',
                options: [{ value: 'true', label: 'Late only' }],
              },
              {
                name: 'delivered',
                label: 'Show',
                options: [{ value: 'true', label: 'Completed deliveries' }],
              },
            ]}
          />
          <DataTable
            columns={columns}
            rows={shipments.data}
            empty={{
              title: showDelivered ? 'No completed deliveries' : 'Nothing in transit',
              description: 'Shipments appear here once they have been collected.',
            }}
          />
          <PaginationControls
            page={page}
            totalPages={shipments.totalPages}
            total={shipments.total}
          />
        </CardContent>
      </Card>
    </div>
  );
}
