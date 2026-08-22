'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Loader2, ShieldCheck, ShieldOff } from 'lucide-react';
import { toString } from 'qrcode';

import { api } from '@/lib/client-api';
import { AuthError } from '@/components/auth/login-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Enrolment {
  secret: string;
  otpauthUri: string;
  issuer: string;
}

/**
 * Section 18 two-factor enrolment.
 *
 * The QR is rendered from the otpauth URI on the client, so the shared secret never travels to a
 * third-party chart service. Recovery codes are shown once — the server keeps only their hashes —
 * so the copy step is deliberately hard to skip.
 */
export function TwoFactorSetup({ enabled }: { enabled: boolean }): React.JSX.Element {
  const router = useRouter();
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const run = async (task: () => Promise<void>): Promise<void> => {
    setPending(true);
    setError(null);
    try {
      await task();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong. Try again.');
    } finally {
      setPending(false);
    }
  };

  const begin = (): Promise<void> =>
    run(async () => {
      setEnrolment(await api.post<Enrolment>('/auth/2fa/enrol', {}));
    });

  const confirm = (): Promise<void> =>
    run(async () => {
      const result = await api.post<{ recoveryCodes: string[] }>('/auth/2fa/confirm', { code });
      setRecoveryCodes(result.recoveryCodes);
      setEnrolment(null);
      setCode('');
      router.refresh();
    });

  const disable = (): Promise<void> =>
    run(async () => {
      await api.post('/auth/2fa/disable', { code });
      setCode('');
      setRecoveryCodes(null);
      router.refresh();
    });

  const copyCodes = async (): Promise<void> => {
    if (!recoveryCodes) return;
    await navigator.clipboard.writeText(recoveryCodes.join('\n'));
    setCopied(true);
  };

  // Recovery codes are shown after enrolment and after nothing else — this branch is the one
  // moment they exist in readable form.
  if (recoveryCodes) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <p className="font-medium">Save these recovery codes now.</p>
          <p className="text-muted-foreground">
            Each one signs you in once if you lose your phone. They are not shown again — GRID-X
            keeps only their hashes.
          </p>
        </div>
        <ul className="grid grid-cols-2 gap-2 rounded-md border bg-muted/40 p-3 font-mono text-sm">
          {recoveryCodes.map((recoveryCode) => (
            <li key={recoveryCode}>{recoveryCode}</li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void copyCodes()}>
            <Copy className="h-4 w-4" /> {copied ? 'Copied' : 'Copy all'}
          </Button>
          <Button size="sm" onClick={() => setRecoveryCodes(null)} disabled={!copied}>
            I have saved them
          </Button>
        </div>
      </div>
    );
  }

  if (enabled) {
    return (
      <div className="space-y-4">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          Two-factor authentication is active on this account.
        </p>
        <AuthError message={error} />
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-2">
            <Label htmlFor="disableCode">Authenticator or recovery code</Label>
            <Input
              id="disableCode"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="text"
              autoComplete="one-time-code"
              placeholder="123456"
              className="w-44 font-mono"
            />
          </div>
          <Button
            variant="destructive"
            onClick={() => void disable()}
            disabled={pending || code.length < 6}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
            Turn off
          </Button>
        </div>
      </div>
    );
  }

  if (enrolment) {
    return (
      <div className="space-y-4">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Scan this code with Google Authenticator, Authy, or your password manager.</li>
          <li>Enter the 6-digit code it shows to finish.</li>
        </ol>

        <div className="flex flex-wrap items-start gap-5">
          <QrCode value={enrolment.otpauthUri} />
          <div className="space-y-2">
            <Label>Or enter this key by hand</Label>
            <p className="max-w-xs break-all rounded-md border bg-muted/40 p-2 font-mono text-xs">
              {enrolment.secret}
            </p>
          </div>
        </div>

        <AuthError message={error} />
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-2">
            <Label htmlFor="confirmCode">6-digit code</Label>
            <Input
              id="confirmCode"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              className="w-32 font-mono tracking-widest"
            />
          </div>
          <Button onClick={() => void confirm()} disabled={pending || code.length !== 6}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Confirm and enable
          </Button>
          <Button variant="ghost" onClick={() => setEnrolment(null)} disabled={pending}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Adds a second step at sign-in using a code from your phone. The blueprint requires it for
        senior roles, and it is the single most effective protection on an account that can approve
        payments or release drawings.
      </p>
      <AuthError message={error} />
      <Button onClick={() => void begin()} disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        Set up two-factor authentication
      </Button>
    </div>
  );
}

/**
 * The QR is generated in the browser rather than fetched from a chart service: the otpauth URI
 * contains the shared secret, and sending that to a third party would defeat the point.
 */
function QrCode({ value, size = 168 }: { value: string; size?: number }): React.JSX.Element {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void toString(value, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 1,
      width: size,
    }).then((markup) => {
      if (!cancelled) setSvg(markup);
    });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!svg) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center rounded-md border bg-muted/40"
      >
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label="Two-factor QR code"
      className="rounded-md border bg-white p-1 [&>svg]:block"
      // The markup comes from the QR encoder running locally on a string this component was
      // handed, not from user input or the network.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
