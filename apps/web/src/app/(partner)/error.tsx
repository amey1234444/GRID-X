'use client';

import { useEffect } from 'react';

/**
 * Segment boundary for the partner PWA.
 *
 * Deliberately plain and dependency-free: this renders on a phone that may be on a poor connection
 * with a half-loaded bundle, and it is bilingual because the partner reading it may not read
 * English (Section 19).
 */
export default function PartnerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  useEffect(() => {
    void fetch('/api/gridx/health/client-error', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        digest: error.digest,
        stack: error.stack?.slice(0, 4000),
        path: typeof window !== 'undefined' ? window.location.pathname : undefined,
      }),
    }).catch(() => {
      /* nothing useful to do if reporting itself fails */
    });
  }, [error]);

  return (
    <div className="grid min-h-[70vh] place-items-center p-6 text-center">
      <div className="max-w-sm space-y-4">
        <h1 className="text-base font-semibold">कुछ गड़बड़ हुई · Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          पेज नहीं खुल सका। आपका भेजा हुआ काम सुरक्षित है।
          <br />
          This page could not open. Anything you already sent is safe.
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          फिर कोशिश करें · Try again
        </button>
      </div>
    </div>
  );
}
