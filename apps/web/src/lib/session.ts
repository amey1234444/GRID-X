import { cookies } from 'next/headers';
import type { AuthUser, Paginated } from '@gridx/shared';

import { API_URL, REFRESH_COOKIE, SESSION_COOKIE } from './config';
import { createLogger, newRequestId } from './logger';

const log = createLogger('api');

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

function messageFromPayload(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message: unknown }).message;
    if (Array.isArray(message)) return message.map(String).join(', ');
    if (typeof message === 'string' && message.trim() !== '') return message;
  }
  return fallback;
}

function parseJson(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function readPayload(response: Response): Promise<{ text: string; payload: unknown }> {
  const text = await response.text();
  return { text, payload: parseJson(text) };
}

async function safeFetch(
  input: string,
  init: RequestInit,
  context: Record<string, unknown>,
): Promise<Response | null> {
  try {
    return await fetch(input, init);
  } catch (error) {
    log.error('api request could not be reached', {
      ...context,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function unreachableResult<T>(): ApiCallResult<T> {
  return {
    status: 503,
    data: null,
    error: 'GRID-X API is not reachable. Check the Render API service and API URL.',
  };
}

/** Exchanges the refresh token for a new session; returns null when the session is dead. */
export async function refreshSession(refreshToken: string): Promise<SessionTokens | null> {
  const response = await safeFetch(
    `${API_URL}/auth/refresh`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    },
    { method: 'POST', path: '/auth/refresh' },
  );
  if (!response) return null;
  if (!response.ok) return null;
  const { payload } = await readPayload(response);
  if (!payload || typeof payload !== 'object') return null;
  const tokens = payload as Partial<SessionTokens>;
  if (!tokens.accessToken || !tokens.refreshToken) return null;
  return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
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

  const requestId = newRequestId();
  const startedAt = Date.now();
  const response = await safeFetch(
    `${API_URL}${path.startsWith('/') ? path : `/${path}`}`,
    {
      ...init,
      headers: {
        'content-type': 'application/json',
        'x-request-id': requestId,
        ...(init.headers ?? {}),
        authorization: `Bearer ${tokens.accessToken}`,
      },
      cache: 'no-store',
    },
    { requestId, method: init.method ?? 'GET', path },
  );

  if (!response) return unreachableResult<T>();

  if (!response.ok && response.status !== 401) {
    log.warn('api request failed', {
      requestId,
      method: init.method ?? 'GET',
      path,
      status: response.status,
      durationMs: Date.now() - startedAt,
    });
  }

  if (response.status === 401 && options.retryOnUnauthorised !== false) {
    const refreshed = await refreshSession(tokens.refreshToken);
    if (!refreshed) {
      clearTokens();
      return { status: 401, data: null, error: 'Session expired' };
    }
    writeTokens(refreshed);
    return apiFetchWithToken<T>(path, init, refreshed.accessToken);
  }

  const { text, payload } = await readPayload(response);

  if (!response.ok) {
    const message = messageFromPayload(
      payload,
      text.trim() || `Request failed with status ${response.status}`,
    );
    return { status: response.status, data: null, error: message };
  }

  return { status: response.status, data: payload as T, error: null };
}

async function apiFetchWithToken<T>(
  path: string,
  init: RequestInit,
  accessToken: string,
): Promise<ApiCallResult<T>> {
  const requestId = newRequestId();
  const response = await safeFetch(
    `${API_URL}${path.startsWith('/') ? path : `/${path}`}`,
    {
      ...init,
      headers: {
        'content-type': 'application/json',
        'x-request-id': requestId,
        ...(init.headers ?? {}),
        authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    },
    { requestId, method: init.method ?? 'GET', path },
  );

  if (!response) return unreachableResult<T>();

  if (!response.ok) {
    log.warn('api request failed after refresh', {
      requestId,
      method: init.method ?? 'GET',
      path,
      status: response.status,
    });
  }
  const { text, payload } = await readPayload(response);
  if (!response.ok) {
    const message = messageFromPayload(
      payload,
      text.trim() || `Request failed with status ${response.status}`,
    );
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
    safeFetch(
      `${API_URL}${path.startsWith('/') ? path : `/${path}`}`,
      {
        method: 'POST',
        headers: {
          ...(contentType ? { 'content-type': contentType } : {}),
          authorization: `Bearer ${accessToken}`,
        },
        body,
        cache: 'no-store',
      },
      { method: 'POST', path },
    );

  let response = await request(tokens.accessToken);
  if (!response) return unreachableResult<T>();
  if (response.status === 401) {
    const refreshed = await refreshSession(tokens.refreshToken);
    if (!refreshed) {
      clearTokens();
      return { status: 401, data: null, error: 'Session expired' };
    }
    writeTokens(refreshed);
    response = await request(refreshed.accessToken);
    if (!response) return unreachableResult<T>();
  }

  const { text, payload } = await readPayload(response);
  if (!response.ok) {
    const message = messageFromPayload(
      payload,
      text.trim() || `Upload failed with status ${response.status}`,
    );
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
    safeFetch(
      `${API_URL}${path.startsWith('/') ? path : `/${path}`}`,
      {
        headers: { authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      },
      { method: 'GET', path },
    );

  let response = await request(tokens.accessToken);
  if (!response) {
    return {
      status: 503,
      body: null,
      contentType: 'text/plain',
      error: 'GRID-X API is not reachable. Check the Render API service and API URL.',
    };
  }
  if (response.status === 401) {
    const refreshed = await refreshSession(tokens.refreshToken);
    if (!refreshed) {
      clearTokens();
      return { status: 401, body: null, contentType: 'text/plain', error: 'Session expired' };
    }
    writeTokens(refreshed);
    response = await request(refreshed.accessToken);
    if (!response) {
      return {
        status: 503,
        body: null,
        contentType: 'text/plain',
        error: 'GRID-X API is not reachable. Check the Render API service and API URL.',
      };
    }
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

/**
 * List endpoints are expected to answer with a page envelope, but a handful
 * historically returned a bare array. Reading `.data` off that array yields
 * `undefined` and the screen dies in render, so every list fetch is normalised
 * here rather than trusting the endpoint's shape.
 */
export async function apiGetPage<T, Extra = unknown>(
  path: string,
  pageSize = 25,
): Promise<Paginated<T> & Partial<Extra>> {
  const result = await apiFetch<unknown>(path);
  return toPage<T, Extra>(result.data, pageSize);
}

/**
 * Coerces whatever a list endpoint returned into a page envelope. Extra keys an
 * endpoint adds alongside the page (a `summary`, say) are carried through.
 */
export function toPage<T, Extra = unknown>(
  value: unknown,
  pageSize = 25,
): Paginated<T> & Partial<Extra> {
  const empty = { data: [], page: 1, pageSize, total: 0, totalPages: 1 } as unknown as Paginated<T> &
    Partial<Extra>;
  if (!value) return empty;

  // A bare array: treat it as a single complete page.
  if (Array.isArray(value)) {
    const data = value as T[];
    return {
      data,
      page: 1,
      pageSize: Math.max(pageSize, data.length),
      total: data.length,
      totalPages: 1,
    } as Paginated<T> & Partial<Extra>;
  }

  if (typeof value !== 'object') return empty;
  const envelope = value as Partial<Paginated<T>> & Record<string, unknown>;
  if (!Array.isArray(envelope.data)) return empty;

  const total = typeof envelope.total === 'number' ? envelope.total : envelope.data.length;
  const size = typeof envelope.pageSize === 'number' && envelope.pageSize > 0 ? envelope.pageSize : pageSize;
  return {
    ...envelope,
    data: envelope.data,
    page: typeof envelope.page === 'number' ? envelope.page : 1,
    pageSize: size,
    total,
    totalPages:
      typeof envelope.totalPages === 'number' && envelope.totalPages > 0
        ? envelope.totalPages
        : Math.max(1, Math.ceil(total / size)),
  } as Paginated<T> & Partial<Extra>;
}

export async function currentUser(): Promise<AuthUser | null> {
  const result = await apiFetch<AuthUser>('/auth/me');
  return result.data;
}
