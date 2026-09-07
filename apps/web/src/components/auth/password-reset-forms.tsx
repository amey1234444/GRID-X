'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';

import {
  forgotPasswordAction,
  resetPasswordAction,
  type AuthActionState,
} from '@/app/actions/auth';
import { AuthError } from '@/components/auth/login-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initialState: AuthActionState = { error: null };

function SubmitButton({ label }: { label: string }): React.JSX.Element {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" size="lg" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}

/**
 * Section 18 — asking for a reset link.
 *
 * The confirmation is deliberately the same whether or not the address is registered. The API
 * answers identically to stop the endpoint being used to find out who works at OSWAR, and telling
 * the user "no such account" here would give that away again.
 */
export function ForgotPasswordForm(): React.JSX.Element {
  const [state, formAction] = useFormState(forgotPasswordAction, initialState);

  if (state.resetRequested) {
    return (
      <div className="space-y-4">
        <p className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/5 px-3 py-3 text-sm text-success">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            If that email belongs to a GRID-X account, a reset link is on its way. It works once and
            expires within the hour.
          </span>
        </p>
        <p className="text-sm text-muted-foreground">
          Nothing arrived? Check spam, then ask your GRID-X administrator — they can issue a reset
          for you.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <AuthError message={state.error} />
      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@oswar.example"
          required
        />
      </div>
      <SubmitButton label="Send reset link" />
    </form>
  );
}

/** Section 18 — setting a new password from an emailed link. */
export function ResetPasswordForm({ token }: { token: string }): React.JSX.Element {
  const [state, formAction] = useFormState(resetPasswordAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <AuthError message={state.error} />
      <input type="hidden" name="token" value={token} />

      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
        <p className="text-xs text-muted-foreground">
          At least 10 characters, with an uppercase letter, a lowercase letter and a number.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>

      <SubmitButton label="Set password and sign in" />
      <p className="text-xs text-muted-foreground">
        Setting a new password signs out every other device using this account.
      </p>
    </form>
  );
}
