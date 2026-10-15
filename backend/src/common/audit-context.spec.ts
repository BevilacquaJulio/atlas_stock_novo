import { describe, expect, it, vi } from 'vitest';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { auditContext } from './audit-context';

describe('auditoria transacional', () => {
  it('grava a auditoria antes do commit e propaga falha para reverter a operação', async () => {
    const events: string[] = [];
    const tx = {
      eventoAuditoria: {
        create: vi.fn(async () => {
          events.push('audit');
          throw new Error('audit-unavailable');
        }),
      },
    };
    const prisma = {
      $transaction: vi.fn(
        async (run: (transaction: typeof tx) => Promise<unknown>) => {
          try {
            const result = await run(tx);
            events.push('commit');
            return result;
          } catch (error) {
            events.push('rollback');
            throw error;
          }
        },
      ),
    };
    const run = () =>
      PrismaService.prototype.withAudit.call(
        prisma as unknown as PrismaService,
        async () => {
          events.push('write');
          return 1;
        },
      );
    const req = {
      method: 'POST',
      path: '/api/compras',
      id: 'synthetic-id',
      user: { id: 1 },
    } as unknown as Request;
    await expect(auditContext.run(req, run)).rejects.toThrow(
      'audit-unavailable',
    );
    expect(events).toEqual(['write', 'audit', 'rollback']);
    expect(tx.eventoAuditoria.create).toHaveBeenCalledWith({
      data: {
        usuarioId: 1,
        acao: 'POST:COMMIT',
        recurso: '/api/compras',
        resultado: 0,
        requestId: 'synthetic-id',
      },
    });
  });
});
