'use client';

import { ErrorScreen } from '@/components/app/error-screen';

/** Segment boundary for the partner area (Section 18 — error monitoring). */
export default function PartnerError({
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
      scope="web.partner"
      homeHref="/partner"
      homeLabel="Back to home"
    />
  );
}
