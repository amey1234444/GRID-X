'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { AuthUser } from '@gridx/shared';

import { API_URL } from '@/lib/config';
import { apiFetch, clearTokens, readTokens, writeTokens } from '@/lib/session';

export interface AuthActionState {
  error: string | null;
  twoFactorRequired?: boolean;
  otpSent?: boolean;
  /** Set once a password reset has been requested, so the form can confirm without leaking. */
  resetRequested?: boolean;
  success?: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  /** The role requires a second factor the user has not enrolled yet (Section 18). */
  twoFactorEnrolmentRequired?: boolean;
}

function landingFor(user: AuthUser): string {
  if (user.userType === 'PARTNER') return '/partner';
  if (user.roleCode === 'QUALITY_INSPECTOR') return '/inspector';
  return '/app';
}

async function post(path: string, body: unknown): Promise<{ ok: boolean; status: number; payload: unknown }> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    return {
      ok: false,
      status: 503,
      payload: { message: 'GRID-X API is not reachable. Check the Render API service and API URL.' },
    };
  }
  const text = await response.text();
  try {
    return { ok: response.ok, status: response.status, payload: text ? JSON.parse(text) : null };
  } catch {
    return {
      ok: response.ok,
      status: response.status,
      payload: response.ok ? null : { message: text.trim() || `Request failed with status ${response.status}` },
    };
  }
}

function messageOf(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message: unknown }).message;
    if (Array.isArray(message)) return message.map(String).join(', ');
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

  // Section 18 — the session that comes back opens only the enrolment screen, so sending them to
  // a dashboard would land them on a page that refuses every request it makes.
  if (session.twoFactorEnrolmentRequired) redirect('/account?enrol=required');
  redirect(landingFor(session.user));
}

/**
 * Section 18 — asks for a reset link.
 *
 * Always reports success: the API answers identically whether or not the address is known, and
 * saying "no such user" here would undo that.
 */
export async function forgotPasswordAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) return { error: 'Enter the work email you sign in with.' };

  const result = await post('/auth/password/forgot', { email });
  if (!result.ok && result.status !== 429) {
    return { error: messageOf(result.payload, 'Unable to send a reset link just now.') };
  }
  if (result.status === 429) {
    return { error: 'Too many attempts. Wait a few minutes before trying again.' };
  }
  return { error: null, resetRequested: true };
}

/** Section 18 — completes a reset from the emailed link. */
export async function resetPasswordAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const token = String(formData.get('token') ?? '');
  const password = String(formData.get('password') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');

  if (!token) return { error: 'This reset link is incomplete. Request a new one.' };
  if (!password) return { error: 'Choose a new password.' };
  if (password !== confirmPassword) return { error: 'The passwords do not match.' };

  const result = await post('/auth/password/reset', { token, password, confirmPassword });
  if (!result.ok) return { error: messageOf(result.payload, 'Unable to set that password.') };

  redirect('/login?passwordChanged=1');
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

/**
 * Changing the password revokes every other refresh token server-side, so the
 * current session is re-issued by signing out and back in rather than silently
 * breaking on the next request.
 */
export async function changePasswordAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const currentPassword = String(formData.get('currentPassword') ?? '');
  const newPassword = String(formData.get('newPassword') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');

  if (!currentPassword || !newPassword) return { error: 'Enter your current and new password.' };
  if (newPassword !== confirmPassword) return { error: 'The new passwords do not match.' };

  const result = await apiFetch<unknown>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
  });
  if (result.error) return { error: result.error };

  clearTokens();
  redirect('/login?passwordChanged=1');
}

/** Section 19 — a user switching their own interface language. */
export async function setLanguageAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const language = String(formData.get('language') ?? '').trim();
  if (language !== 'EN' && language !== 'HI') return { error: 'Choose English or Hindi.' };

  const result = await apiFetch<unknown>('/auth/language', {
    method: 'POST',
    body: JSON.stringify({ language }),
  });
  if (result.error) return { error: result.error };

  revalidatePath('/account');
  revalidatePath('/partner');
  return { error: null, success: language === 'HI' ? 'भाषा हिन्दी पर सेट है।' : 'Language set to English.' };
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
