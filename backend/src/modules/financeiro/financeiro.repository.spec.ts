import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { FinanceiroRepository } from './financeiro.repository';
import { PrismaService } from '../../prisma/prisma.service';

function fixture(count = 1) {
  const despesa = {
    updateMany: vi.fn().mockResolvedValue({ count }),
    findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 1 }),
  };
  const receita = {
    updateMany: vi.fn().mockResolvedValue({ count }),
    findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 2 }),
  };
  const tx = { despesa, receita };
  const prisma = { $transaction: vi.fn((run) => run(tx)) };
  return {
    repo: new FinanceiroRepository(prisma as unknown as PrismaService),
    ...tx,
  };
}

describe('alterações financeiras condicionadas ao estado atual', () => {
  it('paga somente despesa pendente e avulsa, preservando a data informada', async () => {
    const f = fixture();
    const date = new Date('2026-10-08');
    await expect(f.repo.pagarDespesa(1, date)).resolves.toEqual({ id: 1 });
    expect(f.despesa.updateMany).toHaveBeenCalledWith({
      where: { id: 1, status: 'A_PAGAR', compraId: null },
      data: { status: 'PAGO', dataPagamento: date },
    });
  });

  it('edita campos financeiros permitidos sem liberar despesas de compra', async () => {
    const f = fixture();
    await f.repo.updateDespesa(1, { valor: 10, fornecedorId: null });
    expect(f.despesa.updateMany).toHaveBeenCalledWith({
      where: { id: 1, status: 'A_PAGAR', compraId: null },
      data: expect.objectContaining({ valor: 10, fornecedorId: null }),
    });
    const data = f.despesa.updateMany.mock.calls[0][0].data;
    expect(data).not.toHaveProperty('status');
    expect(data).not.toHaveProperty('compraId');
  });

  it('recebe ou edita apenas receitas pendentes', async () => {
    const f = fixture();
    const date = new Date('2026-10-08');
    await expect(f.repo.receberReceita(2, date)).resolves.toEqual({ id: 2 });
    expect(f.receita.updateMany).toHaveBeenCalledWith({
      where: { id: 2, status: 'A_RECEBER' },
      data: { status: 'RECEBIDO', dataRecebimento: date },
    });
    await f.repo.updateReceita(2, { valor: 10, clienteId: null });
    expect(f.receita.updateMany).toHaveBeenLastCalledWith({
      where: { id: 2, status: 'A_RECEBER' },
      data: expect.objectContaining({ valor: 10, clienteId: null }),
    });
    expect(f.receita.updateMany.mock.calls[1][0].data).not.toHaveProperty(
      'status',
    );
  });

  it.each([0, 2])(
    'não retorna sucesso quando a alteração não afeta exatamente um registro (%i)',
    async (count) => {
      const f = fixture(count);
      await expect(f.repo.pagarDespesa(1, new Date())).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(
        f.repo.updateDespesa(1, { valor: 10 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(f.repo.receberReceita(2, new Date())).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(
        f.repo.updateReceita(2, { valor: 10 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(f.despesa.findUniqueOrThrow).not.toHaveBeenCalled();
      expect(f.receita.findUniqueOrThrow).not.toHaveBeenCalled();
    },
  );
});
