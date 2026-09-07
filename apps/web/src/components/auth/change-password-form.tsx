'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';

import { changePasswordAction, type AuthActionState } from '@/app/actions/auth';
import { AuthError } from '@/components/auth/login-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initialState: AuthActionState = { error: null };

function SubmitButton(): React.JSX.Element {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      Change password
    </Button>
  );
}

export function ChangePasswordForm(): React.JSX.Element {
  const [state, formAction] = useFormState(changePasswordAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <AuthError message={state.error} />

      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="newPassword">New password</Label>
          <Input id="newPassword" name="newPassword" type="password" required autoComplete="new-password" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password" />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        At least 10 characters with an uppercase letter, a lowercase letter and a number. Every other
        signed-in device is signed out when the password changes.
      </p>

      <SubmitButton />
    </form>
  );
}
