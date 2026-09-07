import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Wordmark } from '@/components/brand';
import { currentUser } from '@/lib/session';

export const metadata = { title: 'Account · GRID-X' };

/**
 * Account is reachable from every shell — Control, Partner and Inspector — so it
 * sits in its own group and only checks that somebody is signed in.
 */
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const user = await currentUser();
  if (!user) redirect('/login');

  const home = user.userType === 'PARTNER' ? '/partner' : '/app';

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b glass px-4 sm:px-6">
        <Wordmark href={home} />
        <div className="flex-1" />
        <Link
          href={home}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-secondary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>
      </header>
      <main className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
