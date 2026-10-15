import { describe, expect, it, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AuditMiddleware } from './audit.middleware';
import { auditContext } from './audit-context';

describe('eventos HTTP sem conteúdo privado', () => {
  it('registra recusa e ator sem corpo, cookies, query ou segredos', async () => {
    const create = vi.fn().mockResolvedValue({});
    let finish!: () => void;
    const middleware = new AuditMiddleware({
      eventoAuditoria: { create },
    } as unknown as PrismaService);
    const req = {
      method: 'POST',
      path: '/api/compras',
      id: 'synthetic-request-id',
      user: { id: 7 },
      body: { senha: 'synthetic-private-password' },
      headers: { cookie: 'synthetic-private-cookie' },
      query: { token: 'synthetic-private-token' },
    } as unknown as Request;
    const res = {
      statusCode: 403,
      on: (_event: string, callback: () => void) => {
        finish = callback;
      },
    } as unknown as Response;
    middleware.use(req, res, () => expect(auditContext.getStore()).toBe(req));
    finish();
    await Promise.resolve();
    const saved = create.mock.calls[0][0].data;
    expect(saved).toMatchObject({
      usuarioId: 7,
      resultado: 403,
      recurso: '/api/compras',
      requestId: 'synthetic-request-id',
    });
    expect(JSON.stringify(saved)).not.toMatch(/private|senha|cookie|token/);
  });
  it('não grava GET e falha de persistência só registra mensagem operacional sem dados', async () => {
    const create = vi
      .fn()
      .mockRejectedValue(new Error('synthetic-private-driver-error'));
    let finish!: () => void;
    const error = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const middleware = new AuditMiddleware({
      eventoAuditoria: { create },
    } as unknown as PrismaService);
    const req = { method: 'GET', path: '/api/compras' } as Request;
    const res = {
      statusCode: 500,
      on: (_event: string, callback: () => void) => {
        finish = callback;
      },
    } as unknown as Response;
    try {
      middleware.use(req, res, () => undefined);
      finish();
      expect(create).not.toHaveBeenCalled();
      req.method = 'POST';
      finish();
      await Promise.resolve();
      expect(error).toHaveBeenCalledWith(
        'Falha ao persistir evento de auditoria.',
      );
    } finally {
      error.mockRestore();
    }
  });
});
