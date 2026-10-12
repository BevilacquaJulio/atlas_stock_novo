import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ComprasService } from './compras.service';
import { ComprasRepository } from './compras.repository';
import { FornecedoresRepository } from '../fornecedores/fornecedores.repository';
import { ProdutosRepository } from '../produtos/produtos.repository';
import { MovimentacoesRepository } from '../movimentacoes/movimentacoes.repository';
import { PrismaService } from '../../prisma/prisma.service';

function fixture(status: string) {
  const repo = {
    findById: vi.fn().mockResolvedValue({
      id: 1,
      status,
      itens: [
        { produtoId: 2, quantidade: 3, valorUnitario: 10 },
        { produtoId: 1, quantidade: 2, valorUnitario: 5 },
      ],
    }),
    transition: vi.fn(),
  };
  const tx = {
    despesa: { update: vi.fn() },
    compra: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 1 }) },
  };
  const movements = { registrar: vi.fn() };
  const prisma = { $transaction: vi.fn((run) => run(tx)) };
  const service = new ComprasService(
    repo as unknown as ComprasRepository,
    {} as FornecedoresRepository,
    {} as ProdutosRepository,
    movements as unknown as MovimentacoesRepository,
    prisma as unknown as PrismaService,
  );
  return { service, repo, tx, movements };
}

describe('pagamento e recebimento de compras', () => {
  it('paga nota e despesa juntas, sem movimentar estoque', async () => {
    const f = fixture('A_PAGAR');
    const date = new Date('2026-10-08');
    await f.service.pagar(1, { dataPagamento: date }, 9);
    expect(f.repo.transition).toHaveBeenCalledWith(f.tx, 1, 'A_PAGAR', {
      status: 'PAGO',
      dataPagamento: date,
    });
    expect(f.tx.despesa.update).toHaveBeenCalledWith({
      where: { compraId: 1 },
      data: { status: 'PAGO', dataPagamento: date },
    });
    expect(f.movements.registrar).not.toHaveBeenCalled();
  });

  it.each(['confirmar', 'desconfirmar'] as const)(
    '%s registra movimentos por produto em ordem estável na mesma transação',
    async (operation) => {
      const f = fixture(operation === 'confirmar' ? 'PAGO' : 'CONFIRMADA');
      await f.service[operation](1, 9);
      expect(
        f.movements.registrar.mock.calls.map(([input]) => input.produtoId),
      ).toEqual([1, 2]);
      expect(f.movements.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          produtoId: 1,
          quantidade: 2,
          custoUnitario: 5,
          tipo: operation === 'confirmar' ? 'ENTRADA' : 'SAIDA',
          usuarioId: 9,
          compraId: 1,
        }),
        f.tx,
      );
      expect(f.repo.transition).toHaveBeenCalledWith(
        f.tx,
        1,
        operation === 'confirmar' ? 'PAGO' : 'CONFIRMADA',
        { status: operation === 'confirmar' ? 'CONFIRMADA' : 'PAGO' },
      );
    },
  );

  it('estorna pagamento e despesa na mesma transação', async () => {
    const f = fixture('PAGO');
    await f.service.estornarPagamento(1);
    expect(f.repo.transition).toHaveBeenCalledWith(f.tx, 1, 'PAGO', {
      status: 'A_PAGAR',
      dataPagamento: null,
    });
    expect(f.tx.despesa.update).toHaveBeenCalledWith({
      where: { compraId: 1 },
      data: { status: 'A_PAGAR', dataPagamento: null },
    });
    expect(f.movements.registrar).not.toHaveBeenCalled();
  });

  it.each(['ESTOQUE_INSUFICIENTE', 'PRODUTO_NAO_ENCONTRADO'])(
    'propaga falha de negócio %s sem retornar confirmação',
    async (message) => {
      const f = fixture('CONFIRMADA');
      f.movements.registrar.mockRejectedValue(new Error(message));
      await expect(f.service.desconfirmar(1, 9)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(f.tx.compra.findUniqueOrThrow).not.toHaveBeenCalled();
    },
  );

  it('propaga falha inesperada para abortar a transação', async () => {
    const f = fixture('PAGO');
    const error = new Error('database unavailable');
    f.movements.registrar.mockRejectedValue(error);
    await expect(f.service.confirmar(1, 9)).rejects.toBe(error);
    expect(f.tx.compra.findUniqueOrThrow).not.toHaveBeenCalled();
  });
});
