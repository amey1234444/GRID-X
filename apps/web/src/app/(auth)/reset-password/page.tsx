import type { Metadata } from 'next';
import Link from 'next/link';

import { ResetPasswordForm } from '@/components/auth/password-reset-forms';

export const metadata: Metadata = { title: 'Set a new password' };

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: { token?: string };
}): React.JSX.Element {
  const token = searchParams?.token ?? '';

  if (!token) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">This link is incomplete</h1>
          <p className="text-sm text-muted-foreground">
            Reset links expire and can only be used once. Ask for a fresh one and open it from the
            email directly.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="text-sm font-medium text-primary hover:underline"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
        <p className="text-sm text-muted-foreground">
          Choose something you have not used on GRID-X before.
        </p>
      </div>
      <ResetPasswordForm token={token} />
    </div>
  );
}
