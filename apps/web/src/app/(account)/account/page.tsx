import { notFound } from 'next/navigation';

import { DetailList } from '@/components/app/detail-list';
import { PageHeader } from '@/components/app/page-header';
import { ChangePasswordForm } from '@/components/auth/change-password-form';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { currentUser } from '@/lib/session';

export const metadata = { title: 'Account & security · GRID-X' };

export default async function AccountPage(): Promise<React.JSX.Element> {
  const user = await currentUser();
  if (!user) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account & security"
        description="Your profile, the permissions your role carries, and your sign-in credentials."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList
            columns={2}
            items={[
              { label: 'Name', value: user.name },
              { label: 'Role', value: user.roleCode.replace(/_/g, ' ') },
              { label: 'Email', value: user.email ?? '—' },
              { label: 'Phone', value: user.phone ?? '—' },
              { label: 'Account type', value: user.userType === 'PARTNER' ? 'Partner' : 'Internal' },
              { label: 'Partner firm', value: user.partnerName ?? '—' },
              { label: 'Language', value: user.language === 'HI' ? 'हिन्दी' : 'English' },
              {
                label: 'Two-factor',
                value: user.twoFactorEnabled ? 'Enabled' : 'Not enabled',
              },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change password</CardTitle>
          <CardDescription>
            Choose a password you do not use anywhere else. You will be signed out and asked to sign
            in again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permissions</CardTitle>
          <CardDescription>
            Granted by the {user.roleCode.replace(/_/g, ' ')} role. Permissions are fixed in code so
            every environment enforces the same matrix.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-1.5">
          {user.permissions.map((permission) => (
            <Badge key={permission} variant="secondary" className="font-normal">
              {permission}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
