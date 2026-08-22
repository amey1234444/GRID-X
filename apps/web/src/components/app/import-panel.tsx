'use client';

import { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileUp, Loader2 } from 'lucide-react';

import { api } from '@/lib/client-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface ImportIssue {
  row: number;
  field?: string;
  message: string;
}

interface ImportResult {
  entity: string;
  committed: boolean;
  totalRows: number;
  valid: number;
  created: number;
  updated: number;
  issues: ImportIssue[];
}

export interface ImportTarget {
  entity: string;
  title: string;
  description: string;
}

/**
 * §25 step 4 — loading the component, rate and approved-partner masters in bulk.
 *
 * The file is always validated first and the result shown before anything is written, so a bad
 * spreadsheet is a list of rows to fix rather than a half-loaded master to clean up.
 */
export function ImportPanel({ targets }: { targets: ImportTarget[] }): React.JSX.Element {
  const [entity, setEntity] = useState(targets[0]?.entity ?? '');
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<'validate' | 'commit' | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const active = targets.find((target) => target.entity === entity);

  const onFile = async (file: File): Promise<void> => {
    setFileName(file.name);
    setCsv(await file.text());
    setResult(null);
    setError(null);
  };

  const send = async (commit: boolean): Promise<void> => {
    if (!csv.trim()) {
      setError('Choose a CSV file first.');
      return;
    }
    setPending(commit ? 'commit' : 'validate');
    setError(null);
    try {
      setResult(await api.post<ImportResult>(`/imports/${entity}`, { csv, commit }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The import could not be read.');
      setResult(null);
    } finally {
      setPending(null);
    }
  };

  const clean = result !== null && result.issues.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Bulk import</CardTitle>
        <CardDescription>
          Load the pilot masters from a spreadsheet. Nothing is written until you have seen a clean
          validation.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="importEntity">What are you loading?</Label>
            <select
              id="importEntity"
              value={entity}
              onChange={(event) => {
                setEntity(event.target.value);
                setResult(null);
                setError(null);
              }}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              {targets.map((target) => (
                <option key={target.entity} value={target.entity}>
                  {target.title}
                </option>
              ))}
            </select>
            {active ? (
              <p className="text-xs text-muted-foreground">{active.description}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="importFile">CSV file</Label>
            <input
              id="importFile"
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onFile(file);
              }}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-muted/40 file:px-3 file:py-1.5 file:text-sm"
            />
            <a
              href={`/api/imports/${entity}/template`}
              className="inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline"
            >
              <Download className="h-3 w-3" /> Download the column template
            </a>
          </div>
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void send(false)} disabled={pending !== null}>
            {pending === 'validate' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="h-4 w-4" />
            )}
            Validate {fileName ? `“${fileName}”` : 'file'}
          </Button>
          <Button onClick={() => void send(true)} disabled={pending !== null || !clean}>
            {pending === 'commit' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Import {result ? `${result.valid} row(s)` : ''}
          </Button>
        </div>

        {result ? <ImportReport result={result} /> : null}
      </CardContent>
    </Card>
  );
}

function ImportReport({ result }: { result: ImportResult }): React.JSX.Element {
  if (result.committed) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
        <p>
          Imported {result.totalRows} row(s): <strong>{result.created} created</strong>,{' '}
          <strong>{result.updated} updated</strong>.
        </p>
      </div>
    );
  }

  if (result.issues.length === 0) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
        <p>
          All {result.valid} row(s) are valid. Nothing has been written yet — choose{' '}
          <strong>Import</strong> to apply them.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
        <p>
          {result.issues.length} problem(s) across {result.totalRows} row(s). Nothing was written —
          fix the rows below and validate again.
        </p>
      </div>
      <div className="max-h-72 overflow-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Row</th>
              <th className="px-3 py-2 font-medium">Column</th>
              <th className="px-3 py-2 font-medium">Problem</th>
            </tr>
          </thead>
          <tbody>
            {result.issues.map((issue, index) => (
              <tr key={`${issue.row}-${issue.field ?? ''}-${index}`} className="border-t">
                <td className="px-3 py-1.5 font-mono tabular-nums">{issue.row}</td>
                <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">
                  {issue.field ?? '—'}
                </td>
                <td className="px-3 py-1.5">{issue.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
