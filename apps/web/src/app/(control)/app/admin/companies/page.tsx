import { createCompanyAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { DataTable, type Column } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { formatNumber } from '@/lib/format';
import { apiGet } from '@/lib/session';
import type { CompanyRow } from '@/lib/types';

export const metadata = { title: 'Companies · GRID-X' };

export default async function CompaniesPage(): Promise<React.JSX.Element> {
  const companies = await apiGet<CompanyRow[]>('/companies', []);

  const columns: Column<CompanyRow>[] = [
    {
      key: 'company',
      header: 'Company',
      render: (row) => (
        <span className="block">
          <span className="block font-medium">{row.name}</span>
          <span className="block text-xs text-muted-foreground">{row.legalName ?? row.code}</span>
        </span>
      ),
    },
    { key: 'code', header: 'Code', render: (row) => row.code },
    { key: 'gst', header: 'GST', render: (row) => row.gstNumber ?? '—' },
    {
      key: 'location',
      header: 'Location',
      render: (row) => [row.city, row.state].filter(Boolean).join(', ') || '—',
    },
    { key: 'currency', header: 'Currency', render: (row) => row.currency },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.isActive ? 'ACTIVE' : 'INACTIVE'} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies and plants"
        description="GRID-X is multi-company and multi-plant. Every job, material issue and invoice belongs to one company."
        actions={
          <ActionDialog
            title="Add company"
            triggerLabel="Add company"
            submitLabel="Add company"
            action={createCompanyAction}
            fields={[
              { name: 'code', label: 'Code', required: true },
              { name: 'name', label: 'Name', required: true },
              { name: 'legalName', label: 'Legal name', span: 2 },
              { name: 'gstNumber', label: 'GST number' },
              { name: 'addressLine1', label: 'Address' },
              { name: 'city', label: 'City' },
              { name: 'state', label: 'State' },
              { name: 'pincode', label: 'Pincode' },
            ]}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Companies" value={formatNumber(companies.length)} />
        <StatCard label="Active" value={formatNumber(companies.filter((row) => row.isActive).length)} />
      </div>

      <DataTable
        columns={columns}
        rows={companies}
        empty={{ title: 'No companies', description: 'Add the first company to start issuing jobs.' }}
      />
    </div>
  );
}
