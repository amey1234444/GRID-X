import Constants from 'expo-constants';

import { createLogger } from './logger';
import { clearSession, loadServerUrl, loadSession, saveSession, saveServerUrl } from './storage';
import type { LoginResponse, UploadedFileRef } from './types';

const log = createLogger('api');

/**
 * Base URL resolution, in priority order:
 *   1. a URL the operator typed into the app (persisted on device)
 *   2. EXPO_PUBLIC_API_URL at build time
 *   3. app.json → expo.extra.apiBaseUrl
 *   4. the Android emulator loopback default
 *
 * (1) is what makes a single APK usable by several people: they point the app
 * at whichever GRID-X server they were given, no rebuild required.
 */
const BUILD_TIME_URL = process.env.EXPO_PUBLIC_API_URL;
const CONFIG_URL = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl;
const DEFAULT_BASE_URL = 'http://10.0.2.2:4000/api';

let overrideBaseUrl: string | null = null;

/** Trailing slashes and a missing `/api` suffix are the two mistakes people make when typing a host. */
export function normaliseBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  return /\/api$/i.test(withScheme) ? withScheme : `${withScheme}/api`;
}

export function apiBaseUrl(): string {
  return overrideBaseUrl ?? BUILD_TIME_URL ?? CONFIG_URL ?? DEFAULT_BASE_URL;
}

/** True when the URL came from app configuration rather than the device. */
export function isDefaultBaseUrl(): boolean {
  return overrideBaseUrl === null;
}

export async function restoreBaseUrl(): Promise<void> {
  const stored = await loadServerUrl();
  if (stored) overrideBaseUrl = stored;
}

export async function setBaseUrl(raw: string | null): Promise<string> {
  const next = raw === null ? null : normaliseBaseUrl(raw);
  overrideBaseUrl = next && next.length > 0 ? next : null;
  await saveServerUrl(overrideBaseUrl);
  log.info('base url changed', { usingOverride: overrideBaseUrl !== null });
  return apiBaseUrl();
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

function parseBody(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function rawRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  withAuth = true,
): Promise<T> {
  const id = requestId();
  const url = `${apiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const startedAt = Date.now();

  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers: Record<string, string> = { 'x-request-id': id };
  if (!isForm) headers['content-type'] = 'application/json';
  if (withAuth && accessToken) headers.authorization = `Bearer ${accessToken}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    log.error('request failed', { requestId: id, method, path, durationMs: Date.now() - startedAt });
    throw new ApiError(
      0,
      error instanceof Error && error.name === 'AbortError'
        ? 'Request timed out'
        : 'Cannot reach the GRID-X server. Check the server address in Profile → Server.',
    );
  } finally {
    clearTimeout(timer);
  }

  const payload = parseBody(await response.text());

  log.info('request', {
    requestId: id,
    method,
    path,
    status: response.status,
    durationMs: Date.now() - startedAt,
  });

  if (!response.ok) {
    const data = (payload ?? {}) as { message?: string; errors?: Record<string, string[]> };
    throw new ApiError(
      response.status,
      data.message ?? `Request failed (${response.status})`,
      data.errors,
    );
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

/** Photo evidence goes through the same /files/upload endpoint the web app uses. */
export async function uploadPhoto(
  uri: string,
  category: string,
  fileName = 'evidence.jpg',
): Promise<UploadedFileRef> {
  const form = new FormData();
  // React Native's FormData accepts this shape for a local file reference.
  form.append('file', { uri, name: fileName, type: 'image/jpeg' } as unknown as Blob);
  return request<UploadedFileRef>('POST', `/files/upload?category=${category}`, form);
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
