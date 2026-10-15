import { describe, expect, it, vi } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IdempotencyInterceptor } from './idempotency.interceptor';

function fixture() {
  const row = { id: 1, resposta: null as Prisma.JsonValue, resumoEntrada: '' };
  let reserved = false;
  const store = {
    create: vi.fn(async ({ data }) => {
      if (reserved)
        throw new Prisma.PrismaClientKnownRequestError('duplicate', {
          code: 'P2002',
          clientVersion: '7.10.0',
        });
      reserved = true;
      row.resumoEntrada = data.resumoEntrada;
      return row;
    }),
    findUniqueOrThrow: vi.fn(async () => row),
    update: vi.fn(async ({ data }) => {
      row.resposta = data.resposta;
      return row;
    }),
  };
  const req = {
    method: 'POST',
    path: '/api/compras',
    headers: { 'idempotency-key': '11111111-1111-4111-8111-111111111111' },
    user: { id: 1 },
    body: { itens: [1] },
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  const effect = vi.fn(() => of({ id: 42 }));
  const interceptor = new IdempotencyInterceptor({
    requisicaoIdempotente: store,
  } as unknown as PrismaService);
  return {
    req,
    row,
    store,
    effect,
    run: () =>
      lastValueFrom(interceptor.intercept(context, { handle: effect })),
  };
}

describe('idempotência por usuário e conteúdo', () => {
  it('repetição concluída devolve o resultado sem repetir o efeito', async () => {
    const f = fixture();
    expect(await f.run()).toEqual({ id: 42 });
    expect(await f.run()).toEqual({ id: 42 });
    expect(f.effect).toHaveBeenCalledTimes(1);
    expect(f.store.create.mock.calls[0][0].data.usuarioId).toBe(1);
  });
  it('mesma chave com outra entrada e resultado incerto são recusados', async () => {
    const f = fixture();
    await f.run();
    f.req.body = { itens: [2] };
    await expect(f.run()).rejects.toThrow('outra operação');
    expect(f.effect).toHaveBeenCalledTimes(1);
    f.req.body = { itens: [1] };
    f.row.resposta = null;
    await expect(f.run()).rejects.toThrow('resultado incerto');
  });
  it('mantém clientes legados sem chave e recusa chave malformada', async () => {
    const f = fixture();
    f.req.headers['idempotency-key'] = '';
    expect(() => f.run()).toThrow('Chave de idempotência');
    delete (f.req.headers as Record<string, string>)['idempotency-key'];
    await expect(f.run()).resolves.toEqual({ id: 42 });
    expect(f.store.create).not.toHaveBeenCalled();
  });
});
