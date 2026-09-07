import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { api, restoreBaseUrl, restoreTokens, setSessionExpiredHandler, setTokens } from '@/lib/api';
import { createLogger } from '@/lib/logger';
import { clearSession, saveSession } from '@/lib/storage';
import type { AuthUser, LoginResponse } from '@/lib/types';

const log = createLogger('auth');

interface AuthContextValue {
  user: AuthUser | null;
  initializing: boolean;
  loginInternal: (email: string, password: string) => Promise<void>;
  loginPartner: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function persist(result: LoginResponse): Promise<void> {
  setTokens(result.accessToken, result.refreshToken);
  await saveSession(result.accessToken, result.refreshToken, JSON.stringify(result.user));
}

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      log.warn('session expired');
      setUser(null);
    });
    void (async () => {
      try {
        // The saved server address has to be in place before any request is made.
        await restoreBaseUrl();
        const userJson = await restoreTokens();
        if (userJson) {
          setUser(JSON.parse(userJson) as AuthUser);
          // Revalidate in the background; a stale session drops back to login.
          try {
            const fresh = await api.get<AuthUser>('/auth/me');
            setUser(fresh);
          } catch {
            /* handled by the 401 path */
          }
        }
      } finally {
        setInitializing(false);
      }
    })();
    return () => setSessionExpiredHandler(null);
  }, []);

  const loginInternal = useCallback(async (email: string, password: string) => {
    const result = await api.public.post<LoginResponse>('/auth/login', { email, password });
    await persist(result);
    log.info('internal login', { userId: result.user.id, role: result.user.roleCode });
    setUser(result.user);
  }, []);

  const loginPartner = useCallback(async (phone: string, password: string) => {
    const result = await api.public.post<LoginResponse>('/auth/partner/login', { phone, password });
    await persist(result);
    log.info('partner login', { userId: result.user.id, role: result.user.roleCode });
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', {});
    } catch {
      /* clearing locally regardless */
    }
    await clearSession();
    setTokens(null, null);
    setUser(null);
    log.info('logout');
  }, []);

  const value = useMemo(
    () => ({ user, initializing, loginInternal, loginPartner, logout }),
    [user, initializing, loginInternal, loginPartner, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
