'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Check, Loader2 } from 'lucide-react';

import { setLanguageAction, type AuthActionState } from '@/app/actions/auth';
import { AuthError } from '@/components/auth/login-form';
import { Button } from '@/components/ui/button';

const initialState: AuthActionState = { error: null };

/**
 * Section 19 — "Hindi and English interfaces".
 *
 * The partner app was fully translated and the language could only be changed by an OSWAR
 * administrator through the user directory, which a partner worker cannot reach. Someone on a shop
 * floor who needs Hindi had to telephone OSWAR to ask for it.
 */
export function LanguageSwitcher({ current }: { current: 'EN' | 'HI' }): React.JSX.Element {
  const [state, formAction] = useFormState(setLanguageAction, initialState);
  const { pending } = useFormStatus();

  return (
    <form action={formAction} className="space-y-3">
      <AuthError message={state.error} />
      {state.success ? (
        <p className="flex items-center gap-2 text-sm text-success">
          <Check className="h-4 w-4" />
          {state.success}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(
          [
            { value: 'EN', label: 'English' },
            { value: 'HI', label: 'हिन्दी' },
          ] as const
        ).map((option) => (
          <Button
            key={option.value}
            type="submit"
            name="language"
            value={option.value}
            variant={current === option.value ? 'default' : 'outline'}
            disabled={pending}
          >
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {option.label}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Applies to the partner and inspector screens. Job numbers, drawing numbers and component
        codes stay as they are recorded.
      </p>
    </form>
  );
}
