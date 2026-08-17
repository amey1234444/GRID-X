'use client';

import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { AlertCircle, Loader2 } from 'lucide-react';

import type { ActionState } from '@/app/actions/control';
import { FieldRow, type FieldDefinition, type FieldOption } from '@/components/app/field-control';
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

export type { FieldDefinition, FieldOption };

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
              <FieldRow key={field.name} field={field} />
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
