import { LANGUAGES, ROLE_CODES, USER_STATUSES } from '@gridx/shared';

import { createUserAction, suspendUserAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { DataTable, type Column } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { PaginationControls } from '@/components/app/pagination-controls';
import { SearchFilters } from '@/components/app/search-filters';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { formatDateTime, formatNumber, humanise } from '@/lib/format';
import { optionsFrom } from '@/lib/options';
import { readPage, readParam, type SearchParams } from '@/lib/query';
import { companyOptions, partnerOptions } from '@/lib/reference';
import { apiGet } from '@/lib/session';
import { emptyPage, type Paginated, type UserRow } from '@/lib/types';

export const metadata = { title: 'Users · GRID-X' };

export default async function UsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const page = readPage(searchParams);
  const query = new URLSearchParams({ page: String(page), pageSize: '25' });
  for (const key of ['search', 'roleCode', 'status']) {
    const value = readParam(searchParams, key);
    if (value) query.set(key, value);
  }

  const [users, partners, companies] = await Promise.all([
    apiGet<Paginated<UserRow>>(`/users?${query.toString()}`, emptyPage<UserRow>()),
    partnerOptions(),
    companyOptions(),
  ]);

  const columns: Column<UserRow>[] = [
    {
      key: 'user',
      header: 'User',
      render: (row) => (
        <span className="block">
          <span className="block font-medium">{row.name}</span>
          <span className="block text-xs text-muted-foreground">
            {row.email ?? row.phone ?? '—'}
            {row.designation ? ` · ${row.designation}` : ''}
          </span>
        </span>
      ),
    },
    { key: 'role', header: 'Role', render: (row) => humanise(row.role.code) },
    {
      key: 'scope',
      header: 'Scope',
      render: (row) => (row.partner ? row.partner.businessName : 'OSWAR internal'),
    },
    { key: 'language', header: 'Language', render: (row) => (row.language === 'HI' ? 'हिन्दी' : 'English') },
    { key: '2fa', header: '2FA', render: (row) => (row.twoFactorEnabled ? 'Enabled' : 'Disabled') },
    { key: 'lastLogin', header: 'Last login', render: (row) => formatDateTime(row.lastLoginAt) },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: '',
      render: (row) =>
        row.status === 'SUSPENDED' ? null : (
          <ActionDialog
            title="Suspend user"
            description="Users are never deleted. Suspension revokes all active sessions and keeps the audit trail intact."
            triggerLabel="Suspend"
            triggerVariant="outline"
            triggerSize="sm"
            submitLabel="Suspend"
            action={suspendUserAction}
            hidden={{ userId: row.id }}
            fields={[{ name: 'reason', label: 'Reason', type: 'textarea', required: true, span: 2 }]}
          />
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Internal and partner users, their roles and session security posture."
        actions={
          <ActionDialog
            title="Create user"
            description="Partner roles must be linked to a partner; internal roles must not be."
            triggerLabel="Create user"
            submitLabel="Create user"
            action={createUserAction}
            fields={[
              { name: 'name', label: 'Full name', required: true },
              { name: 'designation', label: 'Designation' },
              { name: 'email', label: 'Email', help: 'Email or phone is required' },
              { name: 'phone', label: 'Phone' },
              {
                name: 'roleCode',
                label: 'Role',
                type: 'select',
                required: true,
                options: optionsFrom(ROLE_CODES),
              },
              { name: 'partnerId', label: 'Partner (partner roles only)', type: 'select', options: partners },
              {
                name: 'language',
                label: 'Language',
                type: 'select',
                options: optionsFrom(LANGUAGES),
                defaultValue: 'EN',
              },
              {
                name: 'password',
                label: 'Initial password',
                type: 'password',
                help: 'Leave blank to invite the user instead',
              },
              {
                name: 'twoFactorEnabled',
                label: 'Two-factor authentication',
                type: 'checkbox',
                placeholder: 'Require an OTP at every login',
                span: 2,
              },
              {
                name: 'companyIds',
                label: 'Companies',
                type: 'multiselect',
                options: companies,
                span: 2,
                help: 'Multi-company access — pick every plant this user may see',
              },
            ]}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Users" value={formatNumber(users.total)} />
        <StatCard label="Active" value={formatNumber(users.data.filter((row) => row.status === 'ACTIVE').length)} />
        <StatCard label="Partner users" value={formatNumber(users.data.filter((row) => row.partner !== null).length)} />
        <StatCard
          label="2FA enabled"
          value={formatNumber(users.data.filter((row) => row.twoFactorEnabled).length)}
        />
      </div>

      <SearchFilters
        searchPlaceholder="Search by name, email or phone…"
        filters={[
          { name: 'roleCode', label: 'Role', options: optionsFrom(ROLE_CODES) },
          { name: 'status', label: 'Status', options: optionsFrom(USER_STATUSES) },
        ]}
      />

      <DataTable
        columns={columns}
        rows={users.data}
        empty={{ title: 'No users found', description: 'Create the first user for this role.' }}
      />
      <PaginationControls page={users.page} totalPages={users.totalPages} total={users.total} />
    </div>
  );
}
