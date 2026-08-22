'use client';

import { useEffect } from 'react';
import { RotateCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/** Segment boundary for the control application (Section 18 — error monitoring). */
export default function ControlError({
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
      /* never turn a reporting failure into a second error */
    });
  }, [error]);

  return (
    <div className="grid min-h-[60vh] place-items-center p-6">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">This screen could not be loaded</CardTitle>
          <CardDescription>
            The error has been reported. Your data is unaffected — nothing was part-saved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error.digest ? (
            <p className="font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>
          ) : null}
          <Button onClick={reset} size="sm">
            <RotateCw className="h-4 w-4" /> Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
