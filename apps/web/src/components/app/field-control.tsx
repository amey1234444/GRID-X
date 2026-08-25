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
      <div className="max-h-48 space-y-0.5 overflow-y-auto rounded-input bg-surface-elevated p-1.5 shadow-hairline">
        {(field.options ?? []).length === 0 ? (
          <p className="px-1.5 py-2 text-[0.8125rem] text-subtle">Nothing available to select.</p>
        ) : (
          (field.options ?? []).map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2.5 rounded-control px-1.5 py-1.5 text-[0.8125rem] text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              <input
                type="checkbox"
                name={field.name}
                value={option.value}
                className="peer h-[15px] w-[15px] shrink-0 cursor-pointer rounded-[4px] border-0 bg-surface-active accent-primary"
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
      <label className="flex cursor-pointer items-center gap-2.5 rounded-control py-1 text-[0.8125rem] text-muted-foreground transition-colors hover:text-foreground">
        <input
          id={field.name}
          type="checkbox"
          name={field.name}
          defaultChecked={field.defaultValue === 'on'}
          className="h-[15px] w-[15px] shrink-0 cursor-pointer rounded-[4px] border-0 bg-surface-active accent-primary"
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
    <div className={cn('space-y-1.5', (field.span ?? 1) === 2 && 'sm:col-span-2')}>
      <Label htmlFor={field.name} className="flex items-center gap-1">
        {field.label}
        {field.required ? (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        ) : null}
      </Label>
      <FieldControl field={field} />
      {field.help ? <p className="text-[0.75rem] leading-snug text-subtle">{field.help}</p> : null}
    </div>
  );
}
