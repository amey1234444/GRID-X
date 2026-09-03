import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

import { Button } from '@/components/ui/button';

export const metadata = { title: 'Not found · GRID-X' };

/**
 * Global 404. Deliberately quiet — a missing record is usually a stale link
 * or a permission boundary, not a crisis, so it should not look like one.
 */
export default function NotFound(): React.JSX.Element {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-card bg-card p-6 text-center shadow-hairline">
        <div className="pointer-events-none absolute inset-0 grid-pattern radial-fade opacity-[0.3]" aria-hidden />

        <div className="relative flex flex-col items-center gap-4">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-input bg-surface-elevated text-muted-foreground shadow-hairline">
            <FileQuestion className="h-5 w-5" />
          </span>

          <div className="space-y-1.5">
            <p className="type-label">Error 404</p>
            <h1 className="type-section-title">This page does not exist</h1>
            <p className="type-small mx-auto max-w-sm text-muted-foreground">
              The link may be out of date, the record may have been removed, or your role may not
              have access to it.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <Button size="sm" asChild>
              <Link href="/app">Go to dashboard</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">GRID-X home</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
