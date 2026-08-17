'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

import type { ActionState } from '@/app/actions/control';
import { FieldRow, type FieldDefinition } from '@/components/app/field-control';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface ActionFormSection {
  title?: string;
  description?: string;
  fields: FieldDefinition[];
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

/**
 * Full-page equivalent of ActionDialog, for forms that are too long to sit in a
 * modal — job creation, account security, entity edit screens.
 */
export function ActionForm({
  action,
  sections,
  hidden = {},
  submitLabel = 'Save',
  cancel,
}: {
  action: (state: ActionState, data: FormData) => Promise<ActionState>;
  sections: ActionFormSection[];
  hidden?: Record<string, string | undefined>;
  submitLabel?: string;
  cancel?: React.ReactNode;
}): React.JSX.Element {
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {Object.entries(hidden).map(([name, value]) =>
        value === undefined ? null : <input key={name} type="hidden" name={name} value={value} />,
      )}

      {sections.map((section, index) => (
        <Card key={section.title ?? `section-${index}`}>
          {section.title ? (
            <CardHeader>
              <CardTitle className="text-base">{section.title}</CardTitle>
              {section.description ? (
                <CardDescription>{section.description}</CardDescription>
              ) : null}
            </CardHeader>
          ) : null}
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
            {section.fields.map((field) => (
              <FieldRow key={field.name} field={field} />
            ))}
          </CardContent>
        </Card>
      ))}

      {state.error ? (
        <p className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="flex items-start gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {state.success}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
        {cancel}
      </div>
    </form>
  );
}
