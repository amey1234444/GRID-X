'use client';

import { useEffect } from 'react';

/**
 * Last-resort boundary (Section 18 — error monitoring).
 *
 * A render error in the root layout bypasses every segment boundary, so without this the operator
 * sees an unstyled browser error page and nothing is recorded anywhere. It reports to the API,
 * which forwards to Sentry, and offers a way back.
 */
export default function GlobalError({
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
      /* reporting must never become a second failure */
    });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#0b1120',
          color: '#e2e8f0',
          padding: '2rem',
        }}
      >
        <main style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>GRID-X hit a problem</h1>
          <p style={{ color: '#94a3b8', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            The page could not be displayed. The error has been reported. Nothing you had already
            saved is affected.
          </p>
          {error.digest ? (
            <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
              Reference: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              background: '#2563eb',
              color: 'white',
              border: 0,
              borderRadius: '0.5rem',
              padding: '0.6rem 1.2rem',
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
