import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CanceledError } from 'axios';
import { SESSION_EXPIRED_EVENT } from '../../lib/api';
import { tokenStore } from '../../lib/token-store';
import {
  notifySessionChange,
  SESSION_CHANGED_EVENT,
} from '../../lib/session-lock';
import { reautenticacaoStore } from '../../lib/reautenticacao';
import { loginRequest, logoutRequest, restoreSession } from './auth.api';
import type { AuthUser } from './auth.types';

type Status = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  user: AuthUser | null;
  status: Status;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  const clearPrivateState = useCallback(() => {
    tokenStore.clear();
    reautenticacaoStore.clear();
    void queryClient.cancelQueries();
    queryClient.clear();
    setUser(null);
    setStatus('unauthenticated');
    return tokenStore.getGeneration();
  }, [queryClient]);

  useEffect(() => {
    let active = true;
    const generation = tokenStore.getGeneration();
    async function bootstrap() {
      try {
        const me = await restoreSession();
        if (!active || generation !== tokenStore.getGeneration()) return;
        setUser(me);
        setStatus('authenticated');
      } catch {
        if (!active || generation !== tokenStore.getGeneration()) return;
        clearPrivateState();
      }
    }
    void bootstrap();
    return () => {
      active = false;
    };
  }, [clearPrivateState]);

  useEffect(() => {
    const handler = () => {
      clearPrivateState();
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handler);
    window.addEventListener(SESSION_CHANGED_EVENT, handler);
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
      window.removeEventListener(SESSION_CHANGED_EVENT, handler);
    };
  }, [clearPrivateState]);

  const login = useCallback(
    async (email: string, senha: string) => {
      const generation = clearPrivateState();
      setStatus('loading');
      try {
        const res = await loginRequest(email, senha);
        if (generation !== tokenStore.getGeneration())
          throw new CanceledError('A sessão mudou.');
        tokenStore.setAccess(res.accessToken);
        notifySessionChange();
        setUser(res.user);
        setStatus('authenticated');
      } catch (error) {
        if (generation === tokenStore.getGeneration())
          setStatus('unauthenticated');
        throw error;
      }
    },
    [clearPrivateState],
  );

  const logout = useCallback(async () => {
    clearPrivateState();
    try {
      await logoutRequest();
    } finally {
      notifySessionChange();
    }
  }, [clearPrivateState]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, logout }),
    [user, status, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
