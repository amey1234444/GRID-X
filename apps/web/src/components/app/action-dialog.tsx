'use client';

import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';

import type { ActionState } from '@/app/actions/control';
import { FieldRow, type FieldDefinition, type FieldOption } from '@/components/app/field-control';
import { Alert } from '@/components/ui/alert';
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
      <DialogContent className="max-h-[88vh] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <DialogHeader className="sticky top-0 z-10 border-b border-border-subtle bg-surface px-5 py-4">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <form action={formAction} className="space-y-4 px-5 py-5">
          {Object.entries(hidden).map(([name, value]) =>
            value === undefined ? null : <input key={name} type="hidden" name={name} value={value} />,
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <FieldRow key={field.name} field={field} />
            ))}
          </div>
          {state.error ? <Alert variant="destructive">{state.error}</Alert> : null}
          <DialogFooter className="sticky bottom-0 -mx-5 -mb-5 border-t border-border-subtle bg-surface px-5 py-3">
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
