import { PARTNER_APPROVAL_STATUSES, PARTNER_CATEGORIES, PARTNER_LEVELS, PROCESS_TYPES } from '@gridx/shared';

import { createPartnerAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { DataTable, type Column } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { PaginationControls } from '@/components/app/pagination-controls';
import { SearchFilters } from '@/components/app/search-filters';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/lib/format';
import { optionsFrom } from '@/lib/options';
import { readPage, readParam, type SearchParams } from '@/lib/query';
import { companyOptions } from '@/lib/reference';
import { apiGet } from '@/lib/session';
import { emptyPage, type Paginated, type PartnerRow } from '@/lib/types';

export const metadata = { title: 'Partners · GRID-X' };

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const page = readPage(searchParams);
  const query = new URLSearchParams({ page: String(page), pageSize: '25' });
  for (const key of ['search', 'approvalStatus', 'category', 'process', 'city']) {
    const value = readParam(searchParams, key);
    if (value) query.set(key, value);
  }

  const [partners, companies] = await Promise.all([
    apiGet<Paginated<PartnerRow>>(`/partners?${query.toString()}`, emptyPage<PartnerRow>()),
    companyOptions(),
  ]);

  const approved = partners.data.filter((partner) =>
    ['TRIAL_APPROVED', 'APPROVED', 'CERTIFIED', 'STRATEGIC'].includes(partner.approvalStatus),
  ).length;
  const capacity = partners.data.reduce((sum, partner) => sum + partner.maxCapacityHours, 0);

  const columns: Column<PartnerRow>[] = [
    {
      key: 'partner',
      header: 'Partner',
      render: (row) => (
        <span className="block">
          <span className="block font-medium">{row.businessName}</span>
          <span className="block text-xs text-muted-foreground">
            {row.partnerCode} · {row.ownerName}
          </span>
        </span>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (row) => (
        <span className="text-sm">
          {row.city}, {row.state}
          {row.distanceKm ? (
            <span className="block text-xs text-muted-foreground">{formatNumber(row.distanceKm)} km away</span>
          ) : null}
        </span>
      ),
    },
    { key: 'category', header: 'Category', render: (row) => <Badge variant="outline">{row.category}</Badge> },
    { key: 'status', header: 'Approval', render: (row) => <StatusBadge status={row.approvalStatus} /> },
    { key: 'audit', header: 'Audit', render: (row) => <StatusBadge status={row.auditStatus} /> },
    {
      key: 'capacity',
      header: 'Capacity (h/mo)',
      align: 'right',
      render: (row) => formatNumber(row.maxCapacityHours),
    },
    {
      key: 'score',
      header: 'Score',
      align: 'right',
      render: (row) => (row.currentScore === null ? '—' : formatNumber(row.currentScore, 1)),
    },
    {
      key: 'jobs',
      header: 'Jobs',
      align: 'right',
      render: (row) => formatNumber(row._count?.jobs ?? 0),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Partner network"
        description="Every registered manufacturing partner, their approval state, audits and live capacity."
        actions={
          <ActionDialog
            title="Register a partner"
            description="Onboard a new manufacturing partner. The partner starts in draft and moves through the approval workflow."
            triggerLabel="Register partner"
            submitLabel="Create partner"
            action={createPartnerAction}
            hidden={{ companyId: companies[0]?.value }}
            fields={[
              { name: 'businessName', label: 'Business name', required: true },
              { name: 'ownerName', label: 'Owner name', required: true },
              { name: 'phone', label: 'Phone', required: true, placeholder: '9876543210' },
              { name: 'altPhone', label: 'Alternate phone' },
              { name: 'email', label: 'Email', type: 'text' },
              { name: 'level', label: 'Partner level', type: 'select', options: optionsFrom(PARTNER_LEVELS), defaultValue: 'L2_SMALL' },
              { name: 'addressLine1', label: 'Address', required: true, span: 2 },
              { name: 'city', label: 'City', required: true },
              { name: 'state', label: 'State', required: true },
              { name: 'pincode', label: 'Pincode', required: true, placeholder: '411001' },
              { name: 'distanceKm', label: 'Distance from plant (km)', type: 'number', step: '0.1' },
              { name: 'gstNumber', label: 'GST number' },
              { name: 'udyamNumber', label: 'Udyam number' },
              { name: 'panNumber', label: 'PAN' },
              { name: 'bankName', label: 'Bank name' },
              { name: 'bankAccountNo', label: 'Bank account number' },
              { name: 'bankIfsc', label: 'IFSC' },
              { name: 'maxCapacityHours', label: 'Monthly capacity (hours)', type: 'number', defaultValue: '0' },
              { name: 'maxOpenJobs', label: 'Maximum open jobs', type: 'number', defaultValue: '10' },
              { name: 'paymentTermsDays', label: 'Payment terms (days)', type: 'number', defaultValue: '30' },
              { name: 'notes', label: 'Notes', type: 'textarea', span: 2 },
            ]}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Partners" value={formatNumber(partners.total)} hint="in the network" />
        <StatCard label="Approved on this page" value={formatNumber(approved)} tone="success" />
        <StatCard label="Declared capacity" value={`${formatNumber(capacity)} h`} hint="per month" />
        <StatCard
          label="Open jobs"
          value={formatNumber(partners.data.reduce((sum, partner) => sum + (partner._count?.jobs ?? 0), 0))}
        />
      </div>

      <SearchFilters
        searchPlaceholder="Search by name, code, city or owner…"
        filters={[
          { name: 'approvalStatus', label: 'Approval', options: optionsFrom(PARTNER_APPROVAL_STATUSES) },
          { name: 'category', label: 'Category', options: optionsFrom(PARTNER_CATEGORIES) },
          { name: 'process', label: 'Process', options: optionsFrom(PROCESS_TYPES) },
        ]}
      />

      <DataTable
        columns={columns}
        rows={partners.data}
        rowHref={(row) => `/app/partners/${row.id}`}
        empty={{
          title: 'No partners match these filters',
          description: 'Clear the filters or register your first manufacturing partner.',
        }}
      />

      <PaginationControls page={partners.page} totalPages={partners.totalPages} total={partners.total} />
    </div>
  );
}
