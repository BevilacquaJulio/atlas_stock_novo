import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, refreshAccessToken, SESSION_EXPIRED_EVENT } from './api';
import { tokenStore } from './token-store';
import {
  reautenticacaoStore,
  registrarSolicitanteReautenticacao,
} from './reautenticacao';

const originalApiAdapter = api.defaults.adapter;
const originalAdapter = axios.defaults.adapter;
const response = (
  config: InternalAxiosRequestConfig,
  data: unknown,
): AxiosResponse => ({
  config,
  data,
  status: 200,
  statusText: 'OK',
  headers: new AxiosHeaders(),
});
function unauthorized(config: InternalAxiosRequestConfig): never {
  throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
    ...response(config, {}),
    status: 401,
  });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

beforeEach(() => {
  tokenStore.clear();
  tokenStore.setAccess('synthetic-old-access');
});
afterEach(() => {
  api.defaults.adapter = originalApiAdapter;
  axios.defaults.adapter = originalAdapter;
  tokenStore.clear();
  reautenticacaoStore.clear();
});

describe('sessão no cliente HTTP', () => {
  it('reenvio após timeout mantém a chave; nova operação após sucesso recebe outra chave', async () => {
    const keys: unknown[] = [];
    api.defaults.adapter = vi.fn(async (config) => {
      keys.push(config.headers['Idempotency-Key']);
      if (keys.length === 1)
        throw new AxiosError('timeout', 'ECONNABORTED', config);
      return response(config, { id: 1 });
    });
    const body = {
      fornecedorId: 1,
      itens: [{ produtoId: 1, quantidade: 1, valorUnitario: 1 }],
    };
    await expect(api.post('/compras', body)).rejects.toMatchObject({
      code: 'ECONNABORTED',
    });
    await api.post('/compras', body);
    await api.post('/compras', body);
    expect(keys[0]).toBe(keys[1]);
    expect(keys[2]).not.toBe(keys[1]);
  });
  it('deduplica refresh no bootstrap e persiste o par completo', async () => {
    const pending = deferred<AxiosResponse>();
    let config!: InternalAxiosRequestConfig;
    const adapter = vi.fn((request: InternalAxiosRequestConfig) => {
      config = request;
      return pending.promise;
    });
    axios.defaults.adapter = adapter;
    const first = refreshAccessToken();
    const second = refreshAccessToken();
    expect(first).toBe(second);
    pending.resolve(
      response(config, {
        accessToken: 'fresh-access',
        refreshToken: 'fresh-refresh',
      }),
    );
    await first;
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(tokenStore.getAccess()).toBe('fresh-access');
    expect(localStorage.getItem('g5.refreshToken')).toBeNull();
    expect(config.withCredentials).toBe(true);
    expect(JSON.parse(config.data as string)).toEqual({});
  });

  it('dois 401 compartilham refresh e repetem requisições na mesma sessão', async () => {
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      if (config.url?.endsWith('/auth/refresh'))
        return response(config, {
          accessToken: 'fresh-access',
          refreshToken: 'fresh-refresh',
        });
      if (config.headers.Authorization !== 'Bearer fresh-access')
        unauthorized(config);
      return response(config, { ok: true });
    });
    api.defaults.adapter = adapter;
    axios.defaults.adapter = adapter;
    const result = await Promise.all([
      api.get('/private/a'),
      api.get('/private/b'),
    ]);
    expect(result.every((r) => r.data.ok)).toBe(true);
    expect(
      adapter.mock.calls.filter(([config]) =>
        config.url?.endsWith('/auth/refresh'),
      ),
    ).toHaveLength(1);
  });

  it('refresh atrasado não sobrescreve credenciais de outro login', async () => {
    const pending = deferred<AxiosResponse>();
    let config!: InternalAxiosRequestConfig;
    axios.defaults.adapter = (request) => {
      config = request;
      return pending.promise;
    };
    const refresh = refreshAccessToken();
    await vi.waitFor(() => expect(config).toBeDefined());
    const assertion = expect(refresh).rejects.toMatchObject({
      code: 'ERR_CANCELED',
    });
    tokenStore.clear();
    tokenStore.setAccess('new-account-access');
    pending.resolve(
      response(config, { accessToken: 'obsolete', refreshToken: 'obsolete' }),
    );
    await assertion;
    expect(tokenStore.getAccess()).toBe('new-account-access');
    expect(localStorage.getItem('g5.refreshToken')).toBeNull();
  });

  it('resposta privada atrasada é descartada depois do logout', async () => {
    const pending = deferred<AxiosResponse>();
    let config!: InternalAxiosRequestConfig;
    api.defaults.adapter = (request) => {
      config = request;
      return pending.promise;
    };
    const request = api.get('/private');
    const assertion = expect(request).rejects.toMatchObject({
      code: 'ERR_CANCELED',
    });
    await vi.waitFor(() => expect(config).toBeDefined());
    tokenStore.clear();
    pending.resolve(response(config, { private: 'old-user-data' }));
    await assertion;
  });

  it('falha de refresh encerra a sessão uma vez e limpa a confirmação de senha', async () => {
    const listener = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, listener);
    reautenticacaoStore.set('synthetic-reauth-token', 600);
    api.defaults.adapter = async (config) => unauthorized(config);
    axios.defaults.adapter = async (config) => unauthorized(config);
    await Promise.allSettled([api.get('/private/a'), api.get('/private/b')]);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(tokenStore.getAccess()).toBeNull();
    expect(reautenticacaoStore.get()).toBeNull();
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
  });

  it('destinos externos e baseURL substituída são bloqueados antes do envio', async () => {
    const adapter = vi.fn();
    api.defaults.adapter = adapter;
    await expect(
      api.get('https://outside.example.test/api/private'),
    ).rejects.toThrow('Destino fora');
    await expect(
      api.get('/private', { baseURL: 'https://outside.example.test/api' }),
    ).rejects.toThrow('Destino fora');
    expect(adapter).not.toHaveBeenCalled();
  });
});

function precisaSenha(config: InternalAxiosRequestConfig): never {
  throw new AxiosError('Forbidden', 'ERR_BAD_REQUEST', config, undefined, {
    ...response(config, {
      error: {
        code: 'REAUTENTICACAO_NECESSARIA',
        message: 'Confirme sua senha.',
      },
    }),
    status: 403,
  });
}

describe('confirmação de senha nas ações críticas', () => {
  it('pede a senha uma vez, repete as ações e envia o token só depois da confirmação', async () => {
    const pedir = vi.fn(async () => {
      reautenticacaoStore.set('synthetic-reauth', 600);
      return true;
    });
    const remover = registrarSolicitanteReautenticacao(pedir);
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      if (config.headers['X-Reautenticacao'] !== 'synthetic-reauth')
        precisaSenha(config);
      return response(config, { ok: true });
    });
    api.defaults.adapter = adapter;

    const [a, b] = await Promise.all([
      api.patch('/compras/1/pagar', {}),
      api.patch('/compras/2/pagar', {}),
    ]);

    expect(a.data.ok && b.data.ok).toBe(true);
    expect(pedir).toHaveBeenCalledTimes(1);
    expect(adapter).toHaveBeenCalledTimes(4);
    remover();
  });

  it('se a pessoa cancelar, a ação falha sem nova tentativa', async () => {
    const remover = registrarSolicitanteReautenticacao(async () => false);
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) =>
      precisaSenha(config),
    );
    api.defaults.adapter = adapter;

    await expect(api.patch('/compras/1/pagar', {})).rejects.toMatchObject({
      response: { status: 403 },
    });
    expect(adapter).toHaveBeenCalledTimes(1);
    remover();
  });

  it('não envia a confirmação para a própria rota de reautenticação nem após trocar de sessão', async () => {
    const headers: (string | undefined)[] = [];
    api.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      headers.push(config.headers['X-Reautenticacao'] as string | undefined);
      return response(config, {});
    });
    reautenticacaoStore.set('synthetic-reauth', 600);

    await api.post('/auth/reautenticar', { senha: 'x' });
    await api.get('/financeiro/resumo');
    tokenStore.clear();
    tokenStore.setAccess('outra-conta');
    await api.get('/financeiro/resumo');

    expect(headers).toEqual([undefined, 'synthetic-reauth', undefined]);
  });
});
