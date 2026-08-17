import { cookies } from 'next/headers';
import type { AuthUser } from '@gridx/shared';

import { API_URL, REFRESH_COOKIE, SESSION_COOKIE } from './config';

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

export function readTokens(): SessionTokens | null {
  const store = cookies();
  const accessToken = store.get(SESSION_COOKIE)?.value;
  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

/**
 * Cookies can only be mutated inside a server action or route handler; during a
 * page render the write is skipped and the refreshed token is used for that
 * request only.
 */
export function writeTokens(tokens: SessionTokens): void {
  try {
    const store = cookies();
    store.set(SESSION_COOKIE, tokens.accessToken, { ...cookieOptions, maxAge: 60 * 60 });
    store.set(REFRESH_COOKIE, tokens.refreshToken, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 });
  } catch {
    /* read-only cookie context */
  }
}

export function clearTokens(): void {
  try {
    const store = cookies();
    store.delete(SESSION_COOKIE);
    store.delete(REFRESH_COOKIE);
  } catch {
    /* read-only cookie context */
  }
}

/** Exchanges the refresh token for a new session; returns null when the session is dead. */
export async function refreshSession(refreshToken: string): Promise<SessionTokens | null> {
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as { accessToken: string; refreshToken: string };
  return { accessToken: payload.accessToken, refreshToken: payload.refreshToken };
}

export interface ApiCallResult<T> {
  status: number;
  data: T | null;
  error: string | null;
}

/**
 * Calls the GRID-X API with the current session, transparently refreshing the
 * access token once when it has expired.
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  options: { retryOnUnauthorised?: boolean } = {},
): Promise<ApiCallResult<T>> {
  const tokens = readTokens();
  if (!tokens) return { status: 401, data: null, error: 'Not authenticated' };

  const response = await fetch(`${API_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init.headers ?? {}),
      authorization: `Bearer ${tokens.accessToken}`,
    },
    cache: 'no-store',
  });

  if (response.status === 401 && options.retryOnUnauthorised !== false) {
    const refreshed = await refreshSession(tokens.refreshToken);
    if (!refreshed) {
      clearTokens();
      return { status: 401, data: null, error: 'Session expired' };
    }
    writeTokens(refreshed);
    return apiFetchWithToken<T>(path, init, refreshed.accessToken);
  }

  const text = await response.text();
  const payload: unknown = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as { message: unknown }).message)
        : `Request failed with status ${response.status}`;
    return { status: response.status, data: null, error: message };
  }

  return { status: response.status, data: payload as T, error: null };
}

async function apiFetchWithToken<T>(
  path: string,
  init: RequestInit,
  accessToken: string,
): Promise<ApiCallResult<T>> {
  const response = await fetch(`${API_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init.headers ?? {}),
      authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });
  const text = await response.text();
  const payload: unknown = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as { message: unknown }).message)
        : `Request failed with status ${response.status}`;
    return { status: response.status, data: null, error: message };
  }
  return { status: response.status, data: payload as T, error: null };
}

/**
 * Posts multipart form data (file uploads) with the current session. The body is
 * streamed through untouched, so `content-type` — including the multipart
 * boundary — must not be overridden here.
 */
export async function apiFetchForm<T>(
  path: string,
  body: FormData | ArrayBuffer,
  contentType?: string,
): Promise<ApiCallResult<T>> {
  const tokens = readTokens();
  if (!tokens) return { status: 401, data: null, error: 'Not authenticated' };

  const request = async (accessToken: string) =>
    fetch(`${API_URL}${path.startsWith('/') ? path : `/${path}`}`, {
      method: 'POST',
      headers: {
        ...(contentType ? { 'content-type': contentType } : {}),
        authorization: `Bearer ${accessToken}`,
      },
      body,
      cache: 'no-store',
    });

  let response = await request(tokens.accessToken);
  if (response.status === 401) {
    const refreshed = await refreshSession(tokens.refreshToken);
    if (!refreshed) {
      clearTokens();
      return { status: 401, data: null, error: 'Session expired' };
    }
    writeTokens(refreshed);
    response = await request(refreshed.accessToken);
  }

  const text = await response.text();
  const payload: unknown = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as { message: unknown }).message)
        : `Upload failed with status ${response.status}`;
    return { status: response.status, data: null, error: message };
  }
  return { status: response.status, data: payload as T, error: null };
}

/** Fetches a non-JSON response (CSV exports) with the current session. */
export async function apiFetchText(
  path: string,
): Promise<{ status: number; body: string | null; contentType: string; error: string | null }> {
  const tokens = readTokens();
  if (!tokens) return { status: 401, body: null, contentType: 'text/plain', error: 'Not authenticated' };

  const request = async (accessToken: string) =>
    fetch(`${API_URL}${path.startsWith('/') ? path : `/${path}`}`, {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });

  let response = await request(tokens.accessToken);
  if (response.status === 401) {
    const refreshed = await refreshSession(tokens.refreshToken);
    if (!refreshed) {
      clearTokens();
      return { status: 401, body: null, contentType: 'text/plain', error: 'Session expired' };
    }
    writeTokens(refreshed);
    response = await request(refreshed.accessToken);
  }

  const body = await response.text();
  const contentType = response.headers.get('content-type') ?? 'text/plain';
  if (!response.ok) {
    return { status: response.status, body: null, contentType, error: `Export failed with status ${response.status}` };
  }
  return { status: response.status, body, contentType, error: null };
}

/** Convenience wrapper for server components: returns the value or a fallback. */
export async function apiGet<T>(path: string, fallback: T): Promise<T> {
  const result = await apiFetch<T>(path);
  return result.data ?? fallback;
}

export async function currentUser(): Promise<AuthUser | null> {
  const result = await apiFetch<AuthUser>('/auth/me');
  return result.data;
}
