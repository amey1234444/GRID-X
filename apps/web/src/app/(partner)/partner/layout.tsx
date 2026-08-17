import { redirect } from 'next/navigation';

import { PartnerShell } from '@/components/partner/partner-shell';
import { currentUser } from '@/lib/session';

export const metadata = {
  title: 'GRID-X Partner',
  applicationName: 'GRID-X Partner',
  appleWebApp: { capable: true, statusBarStyle: 'default' as const, title: 'GRID-X Partner' },
};

export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const user = await currentUser();
  if (!user) redirect('/partner/login');
  if (user.userType !== 'PARTNER') redirect('/app');

  return <PartnerShell user={user}>{children}</PartnerShell>;
}
