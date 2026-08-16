'use client';

import { useFormState } from 'react-dom';

import {
  partnerPasswordLoginAction,
  requestOtpAction,
  verifyOtpAction,
  type AuthActionState,
} from '@/app/actions/auth';
import { AuthError, SubmitButton } from '@/components/auth/login-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const initialState: AuthActionState = { error: null };

function OtpForm(): React.JSX.Element {
  const [requestState, requestAction] = useFormState(requestOtpAction, initialState);
  const [verifyState, verifyAction] = useFormState(verifyOtpAction, initialState);
  const codeSent = Boolean(requestState.otpSent) || Boolean(verifyState.otpSent);

  return (
    <div className="space-y-5">
      <form action={requestAction} className="space-y-4">
        <AuthError message={requestState.error} />
        <div className="space-y-2">
          <Label htmlFor="otp-phone">Mobile number</Label>
          <Input
            id="otp-phone"
            name="phone"
            inputMode="tel"
            autoComplete="tel"
            placeholder="98111 00001"
            required
          />
        </div>
        <SubmitButton label={codeSent ? 'Send code again' : 'Send one-time code'} />
      </form>

      {codeSent ? (
        <form action={verifyAction} className="space-y-4 rounded-lg border bg-secondary/40 p-4">
          <AuthError message={verifyState.error} />
          <p className="text-sm text-muted-foreground">
            Enter the 6 digit code sent by SMS. It expires in a few minutes.
          </p>
          <div className="space-y-2">
            <Label htmlFor="verify-phone">Mobile number</Label>
            <Input id="verify-phone" name="phone" inputMode="tel" placeholder="98111 00001" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">One-time code</Label>
            <Input
              id="code"
              name="code"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              placeholder="123456"
              required
            />
          </div>
          <SubmitButton label="Verify and sign in" />
        </form>
      ) : null}
    </div>
  );
}

function PasswordForm(): React.JSX.Element {
  const [state, formAction] = useFormState(partnerPasswordLoginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <AuthError message={state.error} />
      <div className="space-y-2">
        <Label htmlFor="partner-phone">Mobile number</Label>
        <Input
          id="partner-phone"
          name="phone"
          inputMode="tel"
          autoComplete="tel"
          placeholder="98111 00001"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="partner-password">Password</Label>
        <Input
          id="partner-password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </div>
      <SubmitButton label="Sign in" />
    </form>
  );
}

export function PartnerLoginTabs(): React.JSX.Element {
  return (
    <Tabs defaultValue="otp">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="otp">One-time code</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="otp">
        <OtpForm />
      </TabsContent>
      <TabsContent value="password">
        <PasswordForm />
      </TabsContent>
    </Tabs>
  );
}
