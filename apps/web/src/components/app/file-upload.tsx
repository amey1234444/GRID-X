'use client';

import { useId, useRef, useState } from 'react';
import type { FileCategory } from '@gridx/shared';
import { FileText, Loader2, Paperclip, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface UploadedFile {
  id: string;
  originalName: string;
  sizeBytes: number;
}

interface UploadResponse {
  id: string;
  originalName: string;
  sizeBytes: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Uploads immediately on selection and surfaces the resulting file ids as hidden
 * inputs, so a plain server action reads them from FormData like any other field.
 */
export function FileUpload({
  name,
  category = 'OTHER',
  multiple = false,
  accept,
  required = false,
  disabled = false,
  onChange,
  onDeferred,
  label,
}: {
  name: string;
  category?: FileCategory;
  multiple?: boolean;
  accept?: string;
  required?: boolean;
  disabled?: boolean;
  /** Controlled mode: receive the ids instead of relying on the hidden inputs. */
  onChange?: (fileIds: string[]) => void;
  /**
   * Offline-capable callers (the partner PWA) take the raw files when there is no connection and
   * store them for upload on reconnection, instead of failing the selection.
   */
  onDeferred?: (files: File[]) => void;
  label?: string;
}): React.JSX.Element {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSelect = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const selected = Array.from(event.currentTarget.files ?? []);
    if (selected.length === 0) return;

    // Offline, with a caller that can hold on to them: keep the files rather than losing the
    // selection to a failed request (Section 19).
    if (onDeferred && typeof navigator !== 'undefined' && !navigator.onLine) {
      onDeferred(selected);
      setFiles(
        selected.map((file) => ({
          id: `deferred:${file.name}`,
          originalName: file.name,
          sizeBytes: file.size,
        })),
      );
      setError(null);
      event.currentTarget.value = '';
      return;
    }
    setPending(true);
    setError(null);

    const uploaded: UploadedFile[] = [];
    for (const file of selected) {
      const body = new FormData();
      body.append('file', file);
      try {
        const response = await fetch(`/api/gridx/files/upload?category=${category}`, {
          method: 'POST',
          body,
        });
        const payload: unknown = await response.json();
        if (!response.ok) {
          const message =
            payload && typeof payload === 'object' && 'message' in payload
              ? String((payload as { message: unknown }).message)
              : `Upload failed (${response.status})`;
          setError(message);
          break;
        }
        const result = payload as UploadResponse;
        uploaded.push({
          id: result.id,
          originalName: result.originalName,
          sizeBytes: result.sizeBytes,
        });
      } catch {
        setError('Upload failed — check your connection and try again.');
        break;
      }
    }

    setFiles((current) => {
      const next = multiple ? [...current, ...uploaded] : uploaded.slice(-1);
      onChange?.(next.map((file) => file.id));
      return next;
    });
    setPending(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const remove = (id: string): void => {
    setFiles((current) => {
      const next = current.filter((file) => file.id !== id);
      onChange?.(next.map((file) => file.id));
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <input key={file.id} type="hidden" name={name} value={file.id} />
      ))}

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled || pending}
          onChange={(event) => void onSelect(event)}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || pending}
          onClick={() => inputRef.current?.click()}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          {pending ? 'Uploading…' : (label ?? (multiple ? 'Add files' : 'Choose file'))}
        </Button>
        {files.length === 0 ? (
          <span
            className={cn(
              'text-xs',
              required && !pending ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {required ? 'A file is required' : 'No file selected'}
          </span>
        ) : null}
      </div>

      {files.length > 0 ? (
        <ul className="space-y-1">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-center gap-2 rounded-md border bg-secondary/40 px-2 py-1.5 text-xs"
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{file.originalName}</span>
              <span className="shrink-0 text-muted-foreground">{formatSize(file.sizeBytes)}</span>
              <button
                type="button"
                onClick={() => remove(file.id)}
                className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                aria-label={`Remove ${file.originalName}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
