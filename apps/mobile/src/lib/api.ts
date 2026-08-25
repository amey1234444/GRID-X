import Constants from 'expo-constants';

import { createLogger } from './logger';
import { clearSession, loadSession, saveSession } from './storage';
import type { LoginResponse } from './types';

const log = createLogger('api');

const DEFAULT_BASE_URL = 'http://10.0.2.2:4000/api';

export function apiBaseUrl(): string {
  const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;
  return extra?.apiBaseUrl ?? DEFAULT_BASE_URL;
}

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(status: number, message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

let accessToken: string | null = null;
let refreshToken: string | null = null;
let onSessionExpired: (() => void) | null = null;
let refreshPromise: Promise<boolean> | null = null;

export function setTokens(access: string | null, refresh: string | null): void {
  accessToken = access;
  refreshToken = refresh;
}

export function setSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler;
}

function requestId(): string {
  return `mob-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const TIMEOUT_MS = 20_000;

async function rawRequest<T>(method: string, path: string, body?: unknown, withAuth = true): Promise<T> {
  const id = requestId();
  const url = `${apiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const startedAt = Date.now();

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-request-id': id,
  };
  if (withAuth && accessToken) headers.authorization = `Bearer ${accessToken}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    log.error('request failed', { requestId: id, method, path, durationMs: Date.now() - startedAt });
    throw new ApiError(0, error instanceof Error && error.name === 'AbortError' ? 'Request timed out' : 'Network unavailable');
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  log.info('request', {
    requestId: id,
    method,
    path,
    status: response.status,
    durationMs: Date.now() - startedAt,
  });

  if (!response.ok) {
    const data = (payload ?? {}) as { message?: string; errors?: Record<string, string[]> };
    throw new ApiError(response.status, data.message ?? `Request failed (${response.status})`, data.errors);
  }

  return payload as T;
}

async function tryRefresh(): Promise<boolean> {
  if (!refreshToken) return false;
  refreshPromise ??= (async () => {
    try {
      const result = await rawRequest<LoginResponse>('POST', '/auth/refresh', { refreshToken }, false);
      setTokens(result.accessToken, result.refreshToken);
      await saveSession(result.accessToken, result.refreshToken, JSON.stringify(result.user));
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  try {
    return await rawRequest<T>(method, path, body);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      const refreshed = await tryRefresh();
      if (refreshed) return rawRequest<T>(method, path, body);
      await clearSession();
      setTokens(null, null);
      onSessionExpired?.();
    }
    throw error;
  }
}

export async function restoreTokens(): Promise<string | null> {
  const session = await loadSession();
  setTokens(session.accessToken, session.refreshToken);
  return session.userJson;
}

export const api = {
  get: <T>(path: string): Promise<T> => request<T>('GET', path),
  post: <T>(path: string, body?: unknown): Promise<T> => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown): Promise<T> => request<T>('PATCH', path, body),
  put: <T>(path: string, body?: unknown): Promise<T> => request<T>('PUT', path, body),
  delete: <T>(path: string): Promise<T> => request<T>('DELETE', path),
  /** Login endpoints must not carry a stale bearer token. */
  public: {
    post: <T>(path: string, body?: unknown): Promise<T> => rawRequest<T>('POST', path, body, false),
  },
};
