'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function PaginationControls({
  page,
  totalPages,
  total,
}: {
  page: number;
  totalPages: number;
  total: number;
}): React.JSX.Element | null {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  if (total === 0) return null;

  const go = (next: number): void => {
    const query = new URLSearchParams(params.toString());
    query.set('page', String(next));
    router.push(`${pathname}?${query.toString()}`);
  };

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Page {page} of {Math.max(totalPages, 1)} · {total} record{total === 1 ? '' : 's'}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => go(page - 1)}>
          <ChevronLeft /> Previous
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => go(page + 1)}>
          Next <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
