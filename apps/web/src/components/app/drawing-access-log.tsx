'use client';

import { useState } from 'react';
import { History, Loader2 } from 'lucide-react';

import { api } from '@/lib/client-api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDateTime } from '@/lib/format';

interface AccessLogRow {
  id: string;
  action: string;
  createdAt: string;
  ipAddress: string | null;
  user: { id: string; name: string } | null;
  partner: { id: string; businessName: string } | null;
}

/** Controlled-document audit trail: who opened which revision, when and from where. */
export function DrawingAccessLog({ revisionId }: { revisionId: string }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<AccessLogRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async (): Promise<void> => {
    setOpen(true);
    setError(null);
    try {
      setRows(await api.get<AccessLogRow[]>(`/drawings/revisions/${revisionId}/access-log`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load the access log');
    }
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => void load()}>
        <History className="h-4 w-4" /> Access log
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Drawing access log</DialogTitle>
            <DialogDescription>
              Every view and download of this revision, newest first.
            </DialogDescription>
          </DialogHeader>

          {error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : rows === null ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nobody has opened this revision yet.
            </p>
          ) : (
            <ul className="divide-y text-sm">
              {rows.map((row) => (
                <li key={row.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
                  <span className="font-medium">
                    {row.partner?.businessName ?? row.user?.name ?? 'Unknown'}
                  </span>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {row.action}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDateTime(row.createdAt)}
                    {row.ipAddress ? ` · ${row.ipAddress}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
