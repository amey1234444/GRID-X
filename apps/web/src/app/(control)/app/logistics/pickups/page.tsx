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

export const metadata = { title: 'Pickups · GRID-X' };

/** A collection is only outstanding until the vehicle has actually been. */
const AWAITING_PICKUP = 'PLANNED,PICKUP_DUE';

export default async function PickupsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const page = readPage(searchParams);
  const query = new URLSearchParams({
    page: String(page),
    pageSize: '25',
    statuses: AWAITING_PICKUP,
  });
  const partnerId = readParam(searchParams, 'partnerId');
  if (partnerId) query.set('partnerId', partnerId);
  if (readParam(searchParams, 'overdue') === 'true') query.set('pickupOverdue', 'true');

  const [shipments, partners] = await Promise.all([
    apiGet<Paginated<ShipmentRow>>(
      `/logistics/shipments?${query.toString()}`,
      emptyPage<ShipmentRow>(),
    ),
    partnerOptions(),
  ]);

  const now = Date.now();
  const endOfToday = new Date().setHours(23, 59, 59, 999);
  const dueToday = shipments.data.filter(
    (row) => new Date(row.plannedPickupAt).getTime() <= endOfToday,
  );
  const overdue = shipments.data.filter(
    (row) => new Date(row.plannedPickupAt).getTime() < now && row.actualPickupAt === null,
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
      key: 'from',
      header: 'Collect from',
      render: (row) => (
        <span className="block">
          <span className="block">{row.fromPartner?.businessName ?? row.pickupLocation}</span>
          <span className="block text-xs text-muted-foreground">{row.pickupLocation}</span>
        </span>
      ),
    },
    {
      key: 'planned',
      header: 'Planned pickup',
      render: (row) => {
        const late = new Date(row.plannedPickupAt).getTime() < now && !row.actualPickupAt;
        return (
          <span className={late ? 'font-medium text-destructive' : undefined}>
            {formatDateTime(row.plannedPickupAt)}
          </span>
        );
      },
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
        title="Pickups"
        description="Collections planned but not yet made. Module 10's scheduled collection runs."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Due today or earlier" value={String(dueToday.length)} />
        <StatCard label="Overdue" value={String(overdue.length)} hint="Planned time has passed" />
        <StatCard label="Weight waiting" value={`${formatNumber(weight)} kg`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Outstanding collections</CardTitle>
          <CardDescription>
            Shipments still to be picked up. Once collected they move to Deliveries.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchFilters
            searchPlaceholder="Search shipments…"
            filters={[
              { name: 'partnerId', label: 'Partner', options: partners },
              {
                name: 'overdue',
                label: 'Overdue',
                options: [{ value: 'true', label: 'Overdue only' }],
              },
            ]}
          />
          <DataTable
            columns={columns}
            rows={shipments.data}
            empty={{
              title: 'Nothing waiting for collection',
              description: 'Planned pickups appear here until the vehicle has been.',
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
