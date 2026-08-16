import type { Metadata } from 'next';
import Link from 'next/link';

import { PartnerLoginTabs } from '@/components/auth/partner-login';

export const metadata: Metadata = { title: 'Partner sign in' };

export default function PartnerLoginPage(): React.JSX.Element {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Partner sign in</h1>
        <p className="text-sm text-muted-foreground">
          Use the mobile number registered with OSWAR. A one-time code works even on a basic phone
          plan.
        </p>
      </div>
      <PartnerLoginTabs />
      <p className="text-sm text-muted-foreground">
        OSWAR employee?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in with your work email
        </Link>
      </p>
    </div>
  );
}
