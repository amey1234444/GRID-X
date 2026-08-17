'use client';

import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { AlertCircle, Loader2 } from 'lucide-react';

import type { ActionState } from '@/app/actions/control';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
    | 'password';
  options?: FieldOption[];
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  step?: string;
  help?: string;
  span?: 1 | 2;
}

export interface ActionDialogProps {
  title: string;
  description?: string;
  triggerLabel: string;
  triggerVariant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive';
  triggerSize?: 'default' | 'sm' | 'lg' | 'icon';
  submitLabel?: string;
  action: (state: ActionState, data: FormData) => Promise<ActionState>;
  fields: FieldDefinition[];
  hidden?: Record<string, string | undefined>;
  disabled?: boolean;
}

const initialState: ActionState = { error: null };

function SubmitButton({ label }: { label: string }): React.JSX.Element {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}

export function ActionDialog({
  title,
  description,
  triggerLabel,
  triggerVariant = 'default',
  triggerSize = 'sm',
  submitLabel = 'Save',
  action,
  fields,
  hidden = {},
  disabled = false,
}: ActionDialogProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(action, initialState);

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize} disabled={disabled}>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {Object.entries(hidden).map(([name, value]) =>
            value === undefined ? null : <input key={name} type="hidden" name={name} value={value} />,
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <div
                key={field.name}
                className={cn('space-y-2', (field.span ?? 1) === 2 && 'sm:col-span-2')}
              >
                <Label htmlFor={field.name}>
                  {field.label}
                  {field.required ? <span className="ml-1 text-destructive">*</span> : null}
                </Label>
                <FieldControl field={field} />
                {field.help ? <p className="text-xs text-muted-foreground">{field.help}</p> : null}
              </div>
            ))}
          </div>
          {state.error ? (
            <p className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {state.error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton label={submitLabel} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldControl({ field }: { field: FieldDefinition }): React.JSX.Element {
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
