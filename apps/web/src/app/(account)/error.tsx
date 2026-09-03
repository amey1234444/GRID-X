'use client';

import { ErrorScreen } from '@/components/app/error-screen';

/** Segment boundary for the account area (Section 18 — error monitoring). */
export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  return (
    <ErrorScreen
      error={error}
      reset={reset}
      scope="web.account"
      homeHref="/app"
      homeLabel="Back to dashboard"
    />
  );
}
