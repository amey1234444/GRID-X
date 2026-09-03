import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { apiBaseUrl } from './api';
import { createLogger } from './logger';

const log = createLogger('net');

/**
 * Connectivity, inferred from the API itself.
 *
 * The app deliberately does not depend on `@react-native-community/netinfo`:
 * on a shop floor "the phone has a bar of signal" and "the GRID-X API is
 * reachable" are different questions, and only the second one matters. So we
 * treat a failed request as the signal, and confirm recovery by polling the
 * health endpoint — which is also what tells us the API is back after a
 * deploy, not just that Wi-Fi returned.
 */

export type ConnectionState = 'online' | 'offline' | 'checking';

interface ConnectivityValue {
  state: ConnectionState;
  /** Called by the API client whenever a request fails to reach the server. */
  reportUnreachable: () => void;
  /** Called after any successful response. */
  reportReachable: () => void;
  /** Force an immediate health check. */
  check: () => Promise<boolean>;
}

const ConnectivityContext = createContext<ConnectivityValue | null>(null);

const noop = (): void => {};

const RETRY_MS = 8_000;
const HEALTH_TIMEOUT_MS = 6_000;

async function pingHealth(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    // The health route sits outside the authenticated surface, so this works
    // whether or not the session is still valid.
    const response = await fetch(`${apiBaseUrl()}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function ConnectivityProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [state, setState] = useState<ConnectionState>('online');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const check = useCallback(async (): Promise<boolean> => {
    setState((current) => (current === 'offline' ? 'checking' : current));
    const ok = await pingHealth();
    setState(ok ? 'online' : 'offline');
    if (ok) log.info('connectivity restored');
    return ok;
  }, []);

  const reportUnreachable = useCallback(() => {
    setState((current) => {
      if (current === 'offline') return current;
      log.warn('API unreachable — entering offline state');
      return 'offline';
    });
  }, []);

  const reportReachable = useCallback(() => {
    setState((current) => (current === 'online' ? current : 'online'));
  }, []);

  // While offline, poll until the API answers again. The interval is cleared
  // the moment we recover so a backgrounded app is not burning battery.
  useEffect(() => {
    if (state !== 'offline') return undefined;
    timer.current = setTimeout(() => void check(), RETRY_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [state, check]);

  // The API client is a plain module and cannot read context, so it calls the
  // module-level notifiers. Binding them here is what connects the two.
  useEffect(() => {
    bindConnectivitySinks(reportUnreachable, reportReachable);
    return () => bindConnectivitySinks(noop, noop);
  }, [reportUnreachable, reportReachable]);

  const value = useMemo(
    () => ({ state, reportUnreachable, reportReachable, check }),
    [state, reportUnreachable, reportReachable, check],
  );

  return <ConnectivityContext.Provider value={value}>{children}</ConnectivityContext.Provider>;
}

export function useConnectivity(): ConnectivityValue {
  const value = useContext(ConnectivityContext);
  if (!value) throw new Error('useConnectivity must be used inside ConnectivityProvider');
  return value;
}

/*
 * The API client is a plain module, not a hook, so it cannot read context.
 * These module-level hooks let it report reachability without every call site
 * having to thread a callback through.
 */
let unreachableSink: (() => void) | null = null;
let reachableSink: (() => void) | null = null;

export function bindConnectivitySinks(onUnreachable: () => void, onReachable: () => void): void {
  unreachableSink = onUnreachable;
  reachableSink = onReachable;
}

export function notifyUnreachable(): void {
  unreachableSink?.();
}

export function notifyReachable(): void {
  reachableSink?.();
}
