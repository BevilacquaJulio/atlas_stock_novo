import { api, refreshAccessToken } from '../../lib/api';
import { tokenStore } from '../../lib/token-store';
import type { AuthUser, LoginResponse } from './auth.types';

export async function loginRequest(
  email: string,
  senha: string,
): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', {
    email,
    senha,
  });
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
  const refreshToken = tokenStore.getRefresh();
  if (refreshToken) {
    await api.post('/auth/logout', { refreshToken }).catch(() => undefined);
  }
}
