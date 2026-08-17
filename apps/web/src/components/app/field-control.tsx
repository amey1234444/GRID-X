'use client';

import type { FileCategory } from '@gridx/shared';

import { FileUpload } from '@/components/app/file-upload';
import { RepeatableRows, type RowColumn } from '@/components/app/repeatable-rows';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export type { RowColumn };

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDefinition {
  name: string;
  label: string;
  type?:
    | 'text'
    | 'number'
    | 'date'
    | 'datetime-local'
    | 'textarea'
    | 'select'
    | 'multiselect'
    | 'checkbox'
    | 'password'
    | 'file'
    | 'files'
    | 'rows';
  options?: FieldOption[];
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  step?: string;
  help?: string;
  span?: 1 | 2;
  /** File fields only: storage category and accepted MIME types. */
  category?: FileCategory;
  accept?: string;
  /** Row fields only: the columns repeated per line. */
  columns?: RowColumn[];
  addLabel?: string;
  minRows?: number;
}

export function FieldControl({ field }: { field: FieldDefinition }): React.JSX.Element {
  if (field.type === 'rows') {
    return (
      <RepeatableRows
        prefix={field.name}
        columns={field.columns ?? []}
        addLabel={field.addLabel}
        minRows={field.minRows}
      />
    );
  }
  if (field.type === 'file' || field.type === 'files') {
    return (
      <FileUpload
        name={field.name}
        category={field.category}
        accept={field.accept}
        multiple={field.type === 'files'}
        required={field.required}
      />
    );
  }
  if (field.type === 'textarea') {
    return (
      <Textarea
        id={field.name}
        name={field.name}
        placeholder={field.placeholder}
        defaultValue={field.defaultValue}
        required={field.required}
        rows={3}
      />
    );
  }
  if (field.type === 'select') {
    return (
      <Select name={field.name} defaultValue={field.defaultValue}>
        <SelectTrigger id={field.name}>
          <SelectValue placeholder={field.placeholder ?? 'Select…'} />
        </SelectTrigger>
        <SelectContent>
          {(field.options ?? []).map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (field.type === 'multiselect') {
    return (
      <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
        {(field.options ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing available to select.</p>
        ) : (
          (field.options ?? []).map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name={field.name}
                value={option.value}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              {option.label}
            </label>
          ))
        )}
      </div>
    );
  }
  if (field.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          id={field.name}
          type="checkbox"
          name={field.name}
          defaultChecked={field.defaultValue === 'on'}
          className="h-4 w-4 rounded border-input accent-primary"
        />
        {field.placeholder ?? 'Enable'}
      </label>
    );
  }
  return (
    <Input
      id={field.name}
      name={field.name}
      type={field.type ?? 'text'}
      step={field.step}
      placeholder={field.placeholder}
      defaultValue={field.defaultValue}
      required={field.required}
    />
  );
}

/** Label + control + help text, shared by the dialog and full-page form layouts. */
export function FieldRow({ field }: { field: FieldDefinition }): React.JSX.Element {
  return (
    <div className={cn('space-y-2', (field.span ?? 1) === 2 && 'sm:col-span-2')}>
      <Label htmlFor={field.name}>
        {field.label}
        {field.required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      <FieldControl field={field} />
      {field.help ? <p className="text-xs text-muted-foreground">{field.help}</p> : null}
    </div>
  );
}
