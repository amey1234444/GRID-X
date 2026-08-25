import { notFound } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';

import { DetailList } from '@/components/app/detail-list';
import { PageHeader } from '@/components/app/page-header';
import { ChangePasswordForm } from '@/components/auth/change-password-form';
import { LanguageSwitcher } from '@/components/auth/language-switcher';
import { TwoFactorSetup } from '@/components/auth/two-factor-setup';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { currentUser } from '@/lib/session';

export const metadata = { title: 'Account & security · GRID-X' };

export default async function AccountPage({
  searchParams,
}: {
  searchParams?: { enrol?: string };
}): Promise<React.JSX.Element> {
  const user = await currentUser();
  if (!user) notFound();

  // Section 18 — the user signed in to a session that opens only this screen, because their role
  // requires a second factor they have not set up. Saying so plainly is the difference between an
  // enforced policy and an application that appears broken.
  const enrolmentRequired = searchParams?.enrol === 'required' && !user.twoFactorEnabled;

  return (
    <div className="space-y-6">
      <PageHeader
        icon="Settings"
        title="Account & security"
        description="Your profile, the permissions your role carries, and your sign-in credentials."
      />

      {enrolmentRequired ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm"
        >
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1">
            <p className="font-medium text-amber-800 dark:text-amber-300">
              Set up two-factor authentication to continue
            </p>
            <p className="text-muted-foreground">
              The {user.roleCode.replace(/_/g, ' ').toLowerCase()} role holds approvals that move
              money and quality decisions, so GRID-X requires a second factor on it. Until you
              enrol, this is the only screen your sign-in opens.
            </p>
          </div>
        </div>
      ) : null}

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
          <CardTitle className="text-base">Interface language</CardTitle>
          <CardDescription>
            The partner and inspector screens are available in English and Hindi. Change it here
            whenever you like — you do not need to ask an administrator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LanguageSwitcher current={user.language === 'HI' ? 'HI' : 'EN'} />
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
          <CardTitle className="text-base">Two-factor authentication</CardTitle>
          <CardDescription>
            A code from your phone in addition to your password. GRID-X requires this for the
            roles named in system settings — by default group admins, the GRID-X head and finance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TwoFactorSetup enabled={user.twoFactorEnabled} />
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
