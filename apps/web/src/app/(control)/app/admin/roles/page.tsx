import { updateRoleAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { PageHeader } from '@/components/app/page-header';
import { StatCard } from '@/components/app/stat-card';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber, humanise } from '@/lib/format';
import { apiGet, currentUser } from '@/lib/session';
import type { RoleRow } from '@/lib/types';

export const metadata = { title: 'Roles · GRID-X' };

export default async function RolesPage(): Promise<React.JSX.Element> {
  const [roles, user] = await Promise.all([apiGet<RoleRow[]>('/roles', []), currentUser()]);
  const canManage = user?.permissions.includes('role:manage') ?? false;
  const internal = roles.filter((role) => !role.isPartnerRole);
  const partner = roles.filter((role) => role.isPartnerRole);

  return (
    <div className="space-y-6">
      <PageHeader
        icon="Settings"
        title="Roles and permissions"
        description="Role-based access control. Permissions are fixed in code so that every environment enforces the same matrix."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Roles" value={formatNumber(roles.length)} />
        <StatCard label="Internal roles" value={formatNumber(internal.length)} />
        <StatCard label="Partner roles" value={formatNumber(partner.length)} />
      </div>

      {[
        { title: 'Internal roles', description: 'OSWAR employees and management.', rows: internal },
        {
          title: 'Partner roles',
          description: 'Partner users. Every request is scoped to their own partner record.',
          rows: partner,
        },
      ].map((group) => (
        <section key={group.title} className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{group.title}</h2>
            <p className="text-sm text-muted-foreground">{group.description}</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {group.rows.map((role) => (
              <Card key={role.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <CardTitle className="text-base">{role.label ?? role.name}</CardTitle>
                    <CardDescription>{role.description ?? humanise(role.code)}</CardDescription>
                  </div>
                  {canManage ? (
                    <ActionDialog
                      triggerLabel="Edit"
                      triggerVariant="ghost"
                      title={`Edit ${role.label ?? role.name}`}
                      description="Changes how this role reads to whoever assigns it. What the role can do is fixed in code and is shown below."
                      action={updateRoleAction}
                      submitLabel="Save role"
                      fields={[
                        {
                          name: 'name',
                          label: 'Name',
                          required: true,
                          defaultValue: role.name,
                        },
                        {
                          name: 'description',
                          label: 'Description',
                          type: 'textarea',
                          defaultValue: role.description ?? '',
                        },
                      ]}
                      hidden={{ code: role.code }}
                    />
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {formatNumber(role.permissions.length)} permissions
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {role.permissions.map((permission) => (
                      <Badge key={permission} variant="secondary" className="font-normal">
                        {permission}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
