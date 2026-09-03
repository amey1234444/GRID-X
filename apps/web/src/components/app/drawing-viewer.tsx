'use client';

import { useState } from 'react';
import { Download, Eye, Loader2 } from 'lucide-react';

import { api } from '@/lib/client-api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface RevisionView {
  url: string;
  revisionCode: string;
  watermark: string;
  /** True when the served copy has the watermark composited into the file itself. */
  watermarked: boolean;
}

/**
 * Opens a released revision through the API so the access log records who looked
 * at which drawing. Partners are served a copy stamped with their own name and job
 * number; download is a separate call the API authorises against their access mode.
 */
export function DrawingViewer({
  revisionId,
  label = 'View drawing',
  allowDownload = false,
  disabled = false,
  variant = 'outline',
  size = 'sm',
}: {
  revisionId: string;
  label?: string;
  allowDownload?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [view, setView] = useState<RevisionView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async (action: 'VIEW' | 'DOWNLOAD'): Promise<RevisionView | null> => {
    setPending(true);
    setError(null);
    try {
      const result = await api.get<RevisionView>(
        `/drawings/revisions/${revisionId}/view?action=${action}`,
      );
      return result;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to open this drawing');
      return null;
    } finally {
      setPending(false);
    }
  };

  const onView = async (): Promise<void> => {
    setOpen(true);
    const result = await load('VIEW');
    if (result) setView(result);
  };

  const onDownload = async (): Promise<void> => {
    const result = await load('DOWNLOAD');
    if (result) window.open(result.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <Button variant={variant} size={size} disabled={disabled || pending} onClick={() => void onView()}>
        {pending && !open ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] w-[95vw] max-w-5xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {view ? `Revision ${view.revisionCode}` : 'Opening drawing…'}
            </DialogTitle>
            <DialogDescription>
              {view
                ? view.watermarked
                  ? `${view.watermark} — this copy is watermarked and every view is logged.`
                  : `${view.watermark} — every view is recorded in the drawing access log.`
                : 'Every view is recorded in the drawing access log.'}
            </DialogDescription>
          </DialogHeader>

          {error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : view ? (
            <div className="space-y-3">
              <iframe
                src={view.url}
                title={`Drawing revision ${view.revisionCode}`}
                className="h-[70vh] w-full rounded-md border bg-background"
              />
              {allowDownload ? (
                <Button variant="outline" size="sm" onClick={() => void onDownload()} disabled={pending}>
                  <Download className="h-4 w-4" />
                  {view.watermarked ? 'Download watermarked copy' : 'Download original'}
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="flex h-[70vh] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
