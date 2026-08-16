import { redirect } from 'next/navigation';

import { ControlShell } from '@/components/app/control-shell';
import { currentUser } from '@/lib/session';

export default async function ControlLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const user = await currentUser();
  if (!user) redirect('/login');
  if (user.userType === 'PARTNER') redirect('/partner');

  return <ControlShell user={user}>{children}</ControlShell>;
}
