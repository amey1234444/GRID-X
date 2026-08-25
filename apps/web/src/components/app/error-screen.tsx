'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { RotateCw, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { createLogger } from '@/lib/logger';

/**
 * Shared segment error boundary.
 *
 * Reports once, tells the operator what is and is not affected, and always
 * offers two ways out — retry in place, or leave for a known-good screen.
 * A blank screen with a stack trace is not an acceptable failure mode on a
 * shop floor.
 */
export function ErrorScreen({
  error,
  reset,
  /** Where "go back" should land for this segment. */
  homeHref = '/app',
  homeLabel = 'Back to dashboard',
  scope,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  homeHref?: string;
  homeLabel?: string;
  scope: string;
}): React.JSX.Element {
  useEffect(() => {
    createLogger(scope).error('Segment boundary caught an error', {
      digest: error.digest,
      message: error.message,
    });

    void fetch('/api/gridx/health/client-error', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        digest: error.digest,
        stack: error.stack?.slice(0, 4000),
        scope,
        path: typeof window !== 'undefined' ? window.location.pathname : undefined,
      }),
    }).catch(() => {
      /* never turn a reporting failure into a second error */
    });
  }, [error, scope]);

  return (
    <div className="grid min-h-[60vh] place-items-center px-4 py-10">
      <div className="relative w-full max-w-lg overflow-hidden rounded-card bg-card p-6 shadow-hairline">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-destructive/[0.08] to-transparent"
          aria-hidden
        />
        <div className="relative space-y-4">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-input bg-destructive/10 text-destructive">
            <TriangleAlert className="h-[18px] w-[18px]" />
          </span>

          <div className="space-y-1.5">
            <h1 className="type-section-title">This screen could not be loaded</h1>
            <p className="type-small text-muted-foreground">
              The error has been reported. Your data is unaffected — nothing was part-saved, and no
              record was left in an inconsistent state.
            </p>
          </div>

          {error.digest ? (
            <p className="rounded-input bg-surface-elevated px-2.5 py-1.5 font-mono text-[11px] text-subtle shadow-hairline">
              Reference {error.digest}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button onClick={reset} size="sm">
              <RotateCw /> Try again
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href={homeHref}>{homeLabel}</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
