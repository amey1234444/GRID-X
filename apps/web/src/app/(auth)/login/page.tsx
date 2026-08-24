import type { Metadata } from 'next';
import Link from 'next/link';

import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { passwordChanged?: string };
}): React.JSX.Element {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in to GRID-X</h1>
        <p className="text-sm text-muted-foreground">
          Use your OSWAR work email. Senior roles will also be asked for a second factor.
        </p>
      </div>
      {searchParams?.passwordChanged ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          Your password has been changed. Sign in with the new one.
        </p>
      ) : null}
      <LoginForm />
      <p className="text-sm text-muted-foreground">
        <Link href="/forgot-password" className="font-medium text-primary hover:underline">
          Forgotten your password?
        </Link>
      </p>
      <p className="text-sm text-muted-foreground">
        Partner unit?{' '}
        <Link href="/partner/login" className="font-medium text-primary hover:underline">
          Sign in with your mobile number
        </Link>
      </p>
    </div>
  );
}
