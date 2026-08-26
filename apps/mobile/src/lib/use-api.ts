import { useCallback, useEffect, useRef, useState } from 'react';

import { api, ApiError } from './api';
import { createLogger } from './logger';

const log = createLogger('data');

interface ApiQueryState<T> {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Read a GET endpoint. Passing `null` as the path parks the hook, which is how
 * a screen waits for an id it does not have yet.
 */
export function useApiQuery<T>(path: string | null): ApiQueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  const load = useCallback(
    async (asRefresh: boolean) => {
      if (!path) return;
      const gen = ++generation.current;
      if (asRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const result = await api.get<T>(path);
        if (gen === generation.current) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (gen === generation.current) {
          setError(err instanceof ApiError ? err.message : 'Something went wrong');
        }
      } finally {
        if (gen === generation.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [path],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const refresh = useCallback(() => void load(true), [load]);

  return { data, loading, refreshing, error, refresh };
}

type Method = 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface MutationState<TBody> {
  submit: (body?: TBody) => Promise<boolean>;
  submitting: boolean;
  error: string | null;
  fieldErrors: Record<string, string[]> | null;
  reset: () => void;
}

/**
 * Write to the API. Returns success as a boolean rather than throwing, because
 * every call site here is a form that needs to stay mounted and show the error.
 */
export function useApiMutation<TBody = unknown, TResult = unknown>(
  method: Method,
  path: string,
  options: { onSuccess?: (result: TResult) => void } = {},
): MutationState<TBody> {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);
  const onSuccess = options.onSuccess;

  const submit = useCallback(
    async (body?: TBody): Promise<boolean> => {
      setSubmitting(true);
      setError(null);
      setFieldErrors(null);
      try {
        const call =
          method === 'POST'
            ? api.post<TResult>(path, body)
            : method === 'PATCH'
              ? api.patch<TResult>(path, body)
              : method === 'PUT'
                ? api.put<TResult>(path, body)
                : api.delete<TResult>(path);
        const result = await call;
        onSuccess?.(result);
        return true;
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
          setFieldErrors(err.fieldErrors ?? null);
        } else {
          setError('Something went wrong');
        }
        log.warn('mutation failed', { method, path });
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [method, path, onSuccess],
  );

  const reset = useCallback(() => {
    setError(null);
    setFieldErrors(null);
  }, []);

  return { submit, submitting, error, fieldErrors, reset };
}
