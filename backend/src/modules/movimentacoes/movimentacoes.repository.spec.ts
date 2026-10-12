import { describe, expect, it, vi } from 'vitest';
import {
  custoMedioAposEstorno,
  MovimentacoesRepository,
} from './movimentacoes.repository';
import type { PrismaService } from '../../prisma/prisma.service';

describe('custoMedioAposEstorno', () => {
  it('sem operações no meio, volta ao custo anterior (10 a R$ 10 → +10 a R$ 20 → estorno)', () => {
    // Depois da entrada: 20 un a R$ 15.
    expect(custoMedioAposEstorno(20, 15, 10, 20)).toBe(10);
  });

  it('com outra entrada no meio, mantém a média dos lotes que ficaram', () => {
    // 10 a R$ 10 + 10 a R$ 20 + 10 a R$ 30 = 30 un a R$ 20; estorna o lote de R$ 20.
    expect(custoMedioAposEstorno(30, 20, 10, 20)).toBe(20);
  });

  it('sem saldo restante, mantém o custo atual (a próxima entrada redefine)', () => {
    expect(custoMedioAposEstorno(10, 20, 10, 20)).toBe(20);
  });

  it('tolera meio centavo de arredondamento e não grava custo negativo', () => {
    expect(custoMedioAposEstorno(3, 13.33, 1, 20)).toBeCloseTo(9.995, 3);
    expect(custoMedioAposEstorno(2, 10, 1, 20.004)).toBe(0);
  });

  it('recusa quando saídas depois da entrada deixariam custo negativo', () => {
    // 110 un a R$ 10, saem 50 → 60 un (R$ 600) < entrada de 10 a R$ 100.
    expect(() => custoMedioAposEstorno(60, 10, 10, 100)).toThrow(
      'CUSTO_MEDIO_INVALIDO',
    );
  });
});

describe('MovimentacoesRepository.registrar — saída', () => {
  function montar(estoque: number, custoMedio: number) {
    const tx = {
      $queryRaw: vi
        .fn()
        .mockResolvedValue([
          { quantidadeEstoque: estoque, custoMedio: custoMedio },
        ]),
      movimentacao: { create: vi.fn().mockResolvedValue({ id: 1 }) },
      produto: { update: vi.fn() },
    };
    const repo = new MovimentacoesRepository({} as PrismaService);
    return { repo, tx };
  }
  const saida = {
    produtoId: 7,
    tipo: 'SAIDA' as const,
    quantidade: 10,
    custoUnitario: 20,
    motivo: null,
    usuarioId: 1,
  };

  it('estorno de entrada recalcula o custo médio', async () => {
    const { repo, tx } = montar(20, 15);
    await repo.registrar({ ...saida, estornoDeEntrada: true }, tx as never);
    expect(tx.produto.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { quantidadeEstoque: 10, custoMedio: 10 },
    });
  });

  it('saída comum mantém o custo médio', async () => {
    const { repo, tx } = montar(20, 15);
    await repo.registrar(saida, tx as never);
    expect(tx.produto.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { quantidadeEstoque: 10, custoMedio: 15 },
    });
  });

  it('estorno inválido não grava movimentação nem altera o produto', async () => {
    const { repo, tx } = montar(60, 10);
    await expect(
      repo.registrar(
        { ...saida, custoUnitario: 100, estornoDeEntrada: true },
        tx as never,
      ),
    ).rejects.toThrow('CUSTO_MEDIO_INVALIDO');
    expect(tx.movimentacao.create).not.toHaveBeenCalled();
    expect(tx.produto.update).not.toHaveBeenCalled();
  });
});
