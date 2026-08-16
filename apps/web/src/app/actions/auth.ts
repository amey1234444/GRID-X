'use server';

import { redirect } from 'next/navigation';
import type { AuthUser } from '@gridx/shared';

import { API_URL } from '@/lib/config';
import { apiFetch, clearTokens, readTokens, writeTokens } from '@/lib/session';

export interface AuthActionState {
  error: string | null;
  twoFactorRequired?: boolean;
  otpSent?: boolean;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

function landingFor(user: AuthUser): string {
  if (user.userType === 'PARTNER') return '/partner';
  if (user.roleCode === 'QUALITY_INSPECTOR') return '/inspector';
  return '/app';
}

async function post(path: string, body: unknown): Promise<{ ok: boolean; status: number; payload: unknown }> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const text = await response.text();
  return { ok: response.ok, status: response.status, payload: text ? JSON.parse(text) : null };
}

function messageOf(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return fallback;
}

export async function loginAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const twoFactorCode = String(formData.get('twoFactorCode') ?? '').trim();

  if (!email || !password) return { error: 'Enter your work email and password.' };

  const result = await post('/auth/login', {
    email,
    password,
    ...(twoFactorCode ? { twoFactorCode } : {}),
  });

  if (!result.ok) {
    const message = messageOf(result.payload, 'Unable to sign in.');
    return { error: message, twoFactorRequired: message.toLowerCase().includes('two-factor') };
  }

  const session = result.payload as LoginResponse;
  writeTokens({ accessToken: session.accessToken, refreshToken: session.refreshToken });
  redirect(landingFor(session.user));
}

export async function requestOtpAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const phone = String(formData.get('phone') ?? '').trim();
  if (!phone) return { error: 'Enter your registered mobile number.' };

  const result = await post('/auth/otp/request', { phone });
  if (!result.ok) return { error: messageOf(result.payload, 'Unable to send the code.') };
  return { error: null, otpSent: true };
}

export async function verifyOtpAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const phone = String(formData.get('phone') ?? '').trim();
  const code = String(formData.get('code') ?? '').trim();
  if (!phone || code.length !== 6) return { error: 'Enter the 6 digit code sent to your phone.', otpSent: true };

  const result = await post('/auth/otp/verify', { phone, code });
  if (!result.ok) return { error: messageOf(result.payload, 'Invalid code.'), otpSent: true };

  const session = result.payload as LoginResponse;
  writeTokens({ accessToken: session.accessToken, refreshToken: session.refreshToken });
  redirect(landingFor(session.user));
}

export async function partnerPasswordLoginAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const phone = String(formData.get('phone') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!phone || !password) return { error: 'Enter your mobile number and password.' };

  const result = await post('/auth/partner/login', { phone, password });
  if (!result.ok) return { error: messageOf(result.payload, 'Unable to sign in.') };

  const session = result.payload as LoginResponse;
  writeTokens({ accessToken: session.accessToken, refreshToken: session.refreshToken });
  redirect(landingFor(session.user));
}

export async function logoutAction(): Promise<void> {
  const tokens = readTokens();
  if (tokens) {
    await apiFetch('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
  }
  clearTokens();
  redirect('/login');
}
