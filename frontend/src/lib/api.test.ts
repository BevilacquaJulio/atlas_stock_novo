import axios, { AxiosError, AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, refreshAccessToken, SESSION_EXPIRED_EVENT } from './api';
import { tokenStore } from './token-store';
import { financeiroUnlockStore } from './financeiro-unlock';

const originalApiAdapter = api.defaults.adapter;
const originalAdapter = axios.defaults.adapter;
const response = (config: InternalAxiosRequestConfig, data: unknown): AxiosResponse => ({
  config, data, status: 200, statusText: 'OK', headers: new AxiosHeaders(),
});
function unauthorized(config: InternalAxiosRequestConfig): never {
  throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, { ...response(config, {}), status: 401 });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
}

beforeEach(() => {
  tokenStore.clear();
  tokenStore.setRefresh('synthetic-refresh');
  tokenStore.setAccess('synthetic-old-access');
});
afterEach(() => {
  api.defaults.adapter = originalApiAdapter;
  axios.defaults.adapter = originalAdapter;
  tokenStore.clear();
  financeiroUnlockStore.clear();
});

describe('sessão no cliente HTTP', () => {
  it('deduplica refresh no bootstrap e persiste o par completo', async () => {
    const pending = deferred<AxiosResponse>();
    let config!: InternalAxiosRequestConfig;
    const adapter = vi.fn((request: InternalAxiosRequestConfig) => { config = request; return pending.promise; });
    axios.defaults.adapter = adapter;
    const first = refreshAccessToken();
    const second = refreshAccessToken();
    expect(first).toBe(second);
    pending.resolve(response(config, { accessToken: 'fresh-access', refreshToken: 'fresh-refresh' }));
    await first;
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(tokenStore.getRefresh()).toBe('fresh-refresh');
  });

  it('dois 401 compartilham refresh e repetem requisições na mesma sessão', async () => {
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      if (config.url?.endsWith('/auth/refresh')) return response(config, { accessToken: 'fresh-access', refreshToken: 'fresh-refresh' });
      if (config.headers.Authorization !== 'Bearer fresh-access') unauthorized(config);
      return response(config, { ok: true });
    });
    api.defaults.adapter = adapter;
    axios.defaults.adapter = adapter;
    const result = await Promise.all([api.get('/private/a'), api.get('/private/b')]);
    expect(result.every((r) => r.data.ok)).toBe(true);
    expect(adapter.mock.calls.filter(([config]) => config.url?.endsWith('/auth/refresh'))).toHaveLength(1);
  });

  it('refresh atrasado não sobrescreve credenciais de outro login', async () => {
    const pending = deferred<AxiosResponse>();
    let config!: InternalAxiosRequestConfig;
    axios.defaults.adapter = (request) => { config = request; return pending.promise; };
    const refresh = refreshAccessToken();
    const assertion = expect(refresh).rejects.toMatchObject({ code: 'ERR_CANCELED' });
    tokenStore.clear();
    tokenStore.setAccess('new-account-access');
    tokenStore.setRefresh('new-account-refresh');
    pending.resolve(response(config, { accessToken: 'obsolete', refreshToken: 'obsolete' }));
    await assertion;
    expect(tokenStore.getAccess()).toBe('new-account-access');
    expect(tokenStore.getRefresh()).toBe('new-account-refresh');
  });

  it('resposta privada atrasada é descartada depois do logout', async () => {
    const pending = deferred<AxiosResponse>();
    let config!: InternalAxiosRequestConfig;
    api.defaults.adapter = (request) => { config = request; return pending.promise; };
    const request = api.get('/private');
    const assertion = expect(request).rejects.toMatchObject({ code: 'ERR_CANCELED' });
    await vi.waitFor(() => expect(config).toBeDefined());
    tokenStore.clear();
    pending.resolve(response(config, { private: 'old-user-data' }));
    await assertion;
  });

  it('falha de refresh encerra a sessão uma vez e limpa desbloqueio', async () => {
    const listener = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, listener);
    financeiroUnlockStore.set('synthetic-financial-token');
    api.defaults.adapter = async (config) => unauthorized(config);
    axios.defaults.adapter = async (config) => unauthorized(config);
    await Promise.allSettled([api.get('/private/a'), api.get('/private/b')]);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(tokenStore.getAccess()).toBeNull();
    expect(financeiroUnlockStore.get()).toBeNull();
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
  });

  it('destinos externos e baseURL substituída são bloqueados antes do envio', async () => {
    const adapter = vi.fn();
    api.defaults.adapter = adapter;
    await expect(api.get('https://outside.example.test/api/private')).rejects.toThrow('Destino fora');
    await expect(api.get('/private', { baseURL: 'https://outside.example.test/api' })).rejects.toThrow('Destino fora');
    expect(adapter).not.toHaveBeenCalled();
  });
});
