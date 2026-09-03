'use client';

import { ErrorScreen } from '@/components/app/error-screen';

/** Segment boundary for the marketing area (Section 18 — error monitoring). */
export default function MarketingError({
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
      scope="web.marketing"
      homeHref="/"
      homeLabel="Back to home"
    />
  );
}
