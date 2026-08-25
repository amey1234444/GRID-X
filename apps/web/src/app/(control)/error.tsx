'use client';

import { ErrorScreen } from '@/components/app/error-screen';

/** Segment boundary for the control area (Section 18 — error monitoring). */
export default function ControlError({
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
      scope="web.control"
      homeHref="/app"
      homeLabel="Back to dashboard"
    />
  );
}
