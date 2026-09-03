'use client';

import { ErrorScreen } from '@/components/app/error-screen';

/** Segment boundary for the inspector area (Section 18 — error monitoring). */
export default function InspectorError({
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
      scope="web.inspector"
      homeHref="/inspector"
      homeLabel="Back to inspections"
    />
  );
}
