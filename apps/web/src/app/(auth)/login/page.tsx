import type { Metadata } from 'next';
import Link from 'next/link';

import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage(): React.JSX.Element {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in to GRID-X</h1>
        <p className="text-sm text-muted-foreground">
          Use your OSWAR work email. Senior roles will also be asked for a second factor.
        </p>
      </div>
      <LoginForm />
      <p className="text-sm text-muted-foreground">
        Partner unit?{' '}
        <Link href="/partner/login" className="font-medium text-primary hover:underline">
          Sign in with your mobile number
        </Link>
      </p>
    </div>
  );
}
