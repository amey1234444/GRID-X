'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface RowColumn {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'select';
  options?: { value: string; label: string }[];
  step?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
}

/**
 * Repeatable line items — material challan lines, inspection characteristics,
 * shipment contents. Fields are posted as `prefix.<index>.<name>` alongside a
 * `prefix.count`, which the server action reads back with its `rows()` helper.
 */
export function RepeatableRows({
  prefix,
  columns,
  addLabel = 'Add line',
  minRows = 1,
}: {
  prefix: string;
  columns: RowColumn[];
  addLabel?: string;
  minRows?: number;
}): React.JSX.Element {
  const [keys, setKeys] = useState<number[]>(() =>
    Array.from({ length: Math.max(minRows, 1) }, (_, index) => index),
  );
  const [nextKey, setNextKey] = useState(Math.max(minRows, 1));

  const add = (): void => {
    setKeys((current) => [...current, nextKey]);
    setNextKey((value) => value + 1);
  };

  const remove = (key: number): void => {
    setKeys((current) => (current.length <= minRows ? current : current.filter((k) => k !== key)));
  };

  return (
    <div className="space-y-3">
      <input type="hidden" name={`${prefix}.count`} value={keys.length} />

      {keys.map((key, index) => (
        <div key={key} className="rounded-lg border bg-secondary/20 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Line {index + 1}
            </p>
            {keys.length > minRows ? (
              <button
                type="button"
                onClick={() => remove(key)}
                className="rounded p-1 text-muted-foreground hover:bg-background hover:text-destructive"
                aria-label={`Remove line ${index + 1}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {columns.map((column) => {
              const fieldName = `${prefix}.${index}.${column.name}`;
              return (
                <div key={column.name} className="space-y-1.5">
                  <Label htmlFor={fieldName} className="text-xs">
                    {column.label}
                    {column.required ? <span className="ml-1 text-destructive">*</span> : null}
                  </Label>
                  {column.type === 'select' ? (
                    <Select name={fieldName} defaultValue={column.defaultValue}>
                      <SelectTrigger id={fieldName}>
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        {(column.options ?? []).map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={fieldName}
                      name={fieldName}
                      type={column.type ?? 'text'}
                      step={column.step}
                      placeholder={column.placeholder}
                      defaultValue={column.defaultValue}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-4 w-4" /> {addLabel}
      </Button>
    </div>
  );
}
