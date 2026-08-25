import { useCallback, useEffect, useRef, useState } from 'react';

import { api, ApiError } from './api';

interface ApiQueryState<T> {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => void;
}

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
