import { redirect } from 'next/navigation';
import { PERMISSIONS } from '@gridx/shared';

import { InspectorShell } from '@/components/inspector/inspector-shell';
import { currentUser } from '@/lib/session';

export const metadata = { title: 'GRID-X Inspector' };

export default async function InspectorLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const user = await currentUser();
  if (!user) redirect('/login');
  if (user.userType === 'PARTNER') redirect('/partner');
  if (!user.permissions.includes(PERMISSIONS.INSPECTION_PERFORM)) redirect('/app');

  return <InspectorShell user={user}>{children}</InspectorShell>;
}
