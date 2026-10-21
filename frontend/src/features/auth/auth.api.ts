import { api, refreshAccessToken } from '../../lib/api';
import { withSessionLock } from '../../lib/session-lock';
import type { AuthUser, LoginResponse } from './auth.types';

export async function loginRequest(
  email: string,
  senha: string,
): Promise<LoginResponse> {
  const { data } = await withSessionLock(() =>
    api.post<LoginResponse>('/auth/login', {
      email,
      senha,
    }),
  );
  return data;
}

/** Restaura sessão após reload (access token só vive em memória). */
export async function restoreSession(): Promise<AuthUser> {
  await refreshAccessToken();
  return fetchMe();
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>('/auth/me');
  return data;
}

export async function logoutRequest(): Promise<void> {
  await withSessionLock(() => api.post('/auth/logout', {}));
}

/** Confirma a senha do próprio usuário para liberar ações críticas. */
export async function reautenticarRequest(
  senha: string,
): Promise<{ token: string; expiresIn: number }> {
  const { data } = await api.post<{ token: string; expiresIn: number }>(
    '/auth/reautenticar',
    { senha },
  );
  return data;
}
