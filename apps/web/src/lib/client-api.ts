'use client';

import { createLogger, newRequestId } from './logger';

const log = createLogger('client-api');

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(status: number, payload: ApiError) {
    super(payload.message);
    this.status = status;
    this.fieldErrors = payload.errors;
    this.name = 'ApiRequestError';
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const requestId = newRequestId();
  const startedAt = Date.now();
  const response = await fetch(`/api/gridx${path.startsWith('/') ? path : `/${path}`}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-request-id': requestId },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    log.warn('api request failed', {
      requestId,
      method,
      path,
      status: response.status,
      durationMs: Date.now() - startedAt,
    });
  }

  const text = await response.text();
  const payload: unknown = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error =
      payload && typeof payload === 'object'
        ? (payload as ApiError)
        : { message: `Request failed with status ${response.status}` };
    throw new ApiRequestError(response.status, error);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string): Promise<T> => request<T>('GET', path),
  post: <T>(path: string, body?: unknown): Promise<T> => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown): Promise<T> => request<T>('PATCH', path, body),
  put: <T>(path: string, body?: unknown): Promise<T> => request<T>('PUT', path, body),
  delete: <T>(path: string): Promise<T> => request<T>('DELETE', path),
};
