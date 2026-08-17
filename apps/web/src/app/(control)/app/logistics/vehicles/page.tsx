import { createVehicleAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { DataTable, type Column } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { formatNumber, humanise } from '@/lib/format';
import { apiGet } from '@/lib/session';
import type { VehicleRow } from '@/lib/types';

export const metadata = { title: 'Vehicles · GRID-X' };

export default async function VehiclesPage(): Promise<React.JSX.Element> {
  const vehicles = await apiGet<VehicleRow[]>('/logistics/vehicles', []);

  const columns: Column<VehicleRow>[] = [
    { key: 'registration', header: 'Registration', render: (row) => <span className="font-medium">{row.registrationNo}</span> },
    { key: 'type', header: 'Type', render: (row) => humanise(row.vehicleType) },
    {
      key: 'capacity',
      header: 'Capacity (kg)',
      align: 'right',
      render: (row) => (row.capacityKg === null ? '—' : formatNumber(row.capacityKg)),
    },
    { key: 'owner', header: 'Owner', render: (row) => row.ownerName ?? '—' },
    {
      key: 'driver',
      header: 'Driver',
      render: (row) => (row.driverName ? `${row.driverName}${row.driverPhone ? ` · ${row.driverPhone}` : ''}` : '—'),
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicles"
        description="Transport fleet and hired vehicles used for partner pickups and deliveries."
        actions={
          <ActionDialog
            title="Add vehicle"
            triggerLabel="Add vehicle"
            action={createVehicleAction}
            fields={[
              { name: 'registrationNo', label: 'Registration number', required: true },
              { name: 'vehicleType', label: 'Vehicle type', required: true },
              { name: 'capacityKg', label: 'Capacity (kg)', type: 'number' },
              { name: 'ownerName', label: 'Owner' },
              { name: 'driverName', label: 'Driver name' },
              { name: 'driverPhone', label: 'Driver phone' },
            ]}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Vehicles" value={formatNumber(vehicles.length)} />
        <StatCard label="Active" value={formatNumber(vehicles.filter((row) => row.isActive).length)} />
        <StatCard
          label="Total capacity"
          value={`${formatNumber(vehicles.reduce((sum, row) => sum + (row.capacityKg ?? 0), 0))} kg`}
        />
      </div>

      <DataTable columns={columns} rows={vehicles} empty={{ title: 'No vehicles', description: 'Add the vehicles used for logistics.' }} />
    </div>
  );
}
