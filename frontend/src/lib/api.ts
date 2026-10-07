import axios, {
  AxiosError,
  CanceledError,
  type InternalAxiosRequestConfig,
} from 'axios';
import { tokenStore } from './token-store';
import { financeiroUnlockStore } from './financeiro-unlock';

const baseURL = (import.meta.env.VITE_API_URL?.trim() || 'http://localhost:3000/api').replace(/\/+$/, '');
const trustedBase = new URL(baseURL, window.location.origin);

/** Cliente HTTP central. Toda chamada à API passa por aqui. */
export const api = axios.create({ baseURL, timeout: 15_000 });

/** Emitido quando a sessão expira de vez (refresh falhou). */
export const SESSION_EXPIRED_EVENT = 'g5:session-expired';

interface SessionConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _sessionGeneration?: number;
}

function target(config: SessionConfig): URL {
  const url = new URL(api.getUri(config), window.location.origin);
  if (url.origin !== trustedBase.origin || !url.pathname.startsWith(`${trustedBase.pathname}/`)) {
    throw new Error('Destino fora da API configurada.');
  }
  return url;
}

function publicAuth(config: SessionConfig): boolean {
  const path = target(config).pathname;
  return ['login', 'refresh', 'logout'].some((action) => path === `${trustedBase.pathname}/auth/${action}`);
}

function ensureSession(generation: number | undefined): void {
  if (generation !== tokenStore.getGeneration()) throw new CanceledError('A sessão mudou.');
}

api.interceptors.request.use((config: SessionConfig) => {
  const url = target(config);
  if (config._sessionGeneration !== undefined) ensureSession(config._sessionGeneration);
  config._sessionGeneration = tokenStore.getGeneration();
  const token = tokenStore.getAccess();
  if (token && !publicAuth(config)) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (url.pathname.startsWith(`${trustedBase.pathname}/financeiro/`) && !url.pathname.endsWith('/desbloquear')) {
    const finToken = financeiroUnlockStore.get();
    if (finToken) {
      config.headers['X-Financeiro-Token'] = finToken;
    }
  }
  return config;
});

let refreshing: { generation: number; promise: Promise<string> } | null = null;

/** Renova access token usando o refresh token persistido. */
export function refreshAccessToken(): Promise<string> {
  const generation = tokenStore.getGeneration();
  if (refreshing?.generation === generation) return refreshing.promise;
  const promise = performRefresh(generation).finally(() => {
    if (refreshing?.generation === generation) refreshing = null;
  });
  refreshing = { generation, promise };
  return promise;
}

async function performRefresh(generation: number): Promise<string> {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) throw new Error('Sem refresh token.');

  // axios "cru" para não recair no interceptor e evitar loop.
  const { data } = await axios.post<{
    accessToken: string;
    refreshToken: string;
  }>(`${baseURL}/auth/refresh`, { refreshToken }, { timeout: 15_000 });

  ensureSession(generation);
  if (tokenStore.getRefresh() !== refreshToken) throw new CanceledError('A sessão mudou.');

  tokenStore.setAccess(data.accessToken);
  tokenStore.setRefresh(data.refreshToken);
  return data.accessToken;
}

api.interceptors.response.use(
  (response) => {
    ensureSession((response.config as SessionConfig)._sessionGeneration);
    return response;
  },
  async (error: AxiosError) => {
    const original = error.config as SessionConfig | undefined;
    if (original) ensureSession(original._sessionGeneration);

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !publicAuth(original)
    ) {
      original._retry = true;
      try {
        const newToken = await refreshAccessToken();
        ensureSession(original._sessionGeneration);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        if (original._sessionGeneration === tokenStore.getGeneration()) {
          tokenStore.clear();
          financeiroUnlockStore.clear();
          window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
        }
      }
    }
    return Promise.reject(error);
  },
);

/** Extrai a mensagem do envelope de erro do backend `{ error: { code, message } }`. */
export function getApiErrorMessage(error: unknown, fallback = 'Ocorreu um erro.'): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as
      | { error?: { message?: string } }
      | undefined;
    return data?.error?.message ?? error.message ?? fallback;
  }
  return fallback;
}
