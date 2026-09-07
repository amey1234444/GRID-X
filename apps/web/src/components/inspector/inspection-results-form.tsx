'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import { RESULT_VERDICTS } from '@gridx/shared';

import { saveInspectionResultsAction, type ActionState } from '@/app/actions/control';
import { FileUpload } from '@/components/app/file-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { InspectionDetail } from '@/lib/types';

type Characteristic = NonNullable<InspectionDetail['inspectionPlan']>['characteristics'][number];

const initialState: ActionState = { error: null };

function SubmitButton(): React.JSX.Element {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      Save measurements
    </Button>
  );
}

export function InspectionResultsForm({
  inspectionId,
  characteristics,
  offeredQuantity,
}: {
  inspectionId: string;
  characteristics: Characteristic[];
  offeredQuantity: number;
}): React.JSX.Element {
  const [state, formAction] = useFormState(saveInspectionResultsAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="inspectionId" value={inspectionId} />
      <input type="hidden" name="resultCount" value={characteristics.length} />

      <div className="space-y-2 sm:max-w-xs">
        <Label htmlFor="inspectedQuantity">Inspected quantity</Label>
        <Input
          id="inspectedQuantity"
          name="inspectedQuantity"
          type="number"
          inputMode="numeric"
          required
          defaultValue={offeredQuantity}
        />
      </div>

      <div className="space-y-4">
        {characteristics.map((characteristic, index) => (
          <div key={characteristic.id} className="space-y-3 rounded-xl border bg-card p-4">
            <input type="hidden" name={`results.${index}.characteristicId`} value={characteristic.id} />
            <input type="hidden" name={`results.${index}.characteristicName`} value={characteristic.characteristic} />
            <input type="hidden" name={`results.${index}.specification`} value={characteristic.specification} />
            <input type="hidden" name={`results.${index}.sampleNumber`} value={1} />
            {characteristic.measuringInstrument ? (
              <input
                type="hidden"
                name={`results.${index}.measuringInstrument`}
                value={characteristic.measuringInstrument}
              />
            ) : null}

            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  {characteristic.sequence}. {characteristic.characteristic}
                  {characteristic.isCritical ? (
                    <span className="ml-2 text-xs font-semibold uppercase text-destructive">critical</span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {characteristic.specification}
                  {characteristic.unit ? ` ${characteristic.unit}` : ''}
                  {characteristic.measuringInstrument ? ` · ${characteristic.measuringInstrument}` : ''}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor={`actual-${index}`}>Measured value</Label>
                <Input id={`actual-${index}`} name={`results.${index}.actualValue`} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`numeric-${index}`}>Numeric value</Label>
                <Input
                  id={`numeric-${index}`}
                  name={`results.${index}.numericValue`}
                  type="number"
                  step="0.001"
                  inputMode="decimal"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`verdict-${index}`}>Verdict</Label>
                <select
                  id={`verdict-${index}`}
                  name={`results.${index}.verdict`}
                  defaultValue="PASS"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {RESULT_VERDICTS.map((verdict) => (
                    <option key={verdict} value={verdict}>
                      {verdict}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`remarks-${index}`}>Remarks</Label>
              <Input id={`remarks-${index}`} name={`results.${index}.remarks`} />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label>Evidence photographs</Label>
        <FileUpload name="photographFileIds" category="PHOTOGRAPH" accept="image/*" multiple />
      </div>

      {state.error ? (
        <p className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {state.error}
        </p>
      ) : null}
      {state.success ? <p className="text-sm text-success">Measurements recorded.</p> : null}

      <SubmitButton />
    </form>
  );
}
