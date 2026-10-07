import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ComprasService } from './compras.service';
import { ComprasRepository } from './compras.repository';
import { FornecedoresRepository } from '../fornecedores/fornecedores.repository';
import { ProdutosRepository } from '../produtos/produtos.repository';
import { MovimentacoesRepository } from '../movimentacoes/movimentacoes.repository';
import { PrismaService } from '../../prisma/prisma.service';

const makeComprasRepo = () => ({
  findMany: vi.fn(),
  findById: vi.fn(),
  createCompra: vi.fn(),
  updateStatus: vi.fn(),
  cancelarCompra: vi.fn(),
});

const makeFornecedoresRepo = () => ({
  findById: vi.fn(),
});

const makeProdutosRepo = () => ({
  findById: vi.fn(),
});

const makeMovimentacoesRepo = () => ({
  registrar: vi.fn(),
});

const makePrisma = () => ({
  $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn({})),
});

describe('ComprasService', () => {
  let comprasRepo: ReturnType<typeof makeComprasRepo>;
  let fornecedoresRepo: ReturnType<typeof makeFornecedoresRepo>;
  let produtosRepo: ReturnType<typeof makeProdutosRepo>;
  let movimentacoesRepo: ReturnType<typeof makeMovimentacoesRepo>;
  let prisma: ReturnType<typeof makePrisma>;
  let service: ComprasService;

  beforeEach(() => {
    comprasRepo = makeComprasRepo();
    fornecedoresRepo = makeFornecedoresRepo();
    produtosRepo = makeProdutosRepo();
    movimentacoesRepo = makeMovimentacoesRepo();
    prisma = makePrisma();
    service = new ComprasService(
      comprasRepo as unknown as ComprasRepository,
      fornecedoresRepo as unknown as FornecedoresRepository,
      produtosRepo as unknown as ProdutosRepository,
      movimentacoesRepo as unknown as MovimentacoesRepository,
      prisma as unknown as PrismaService,
    );
  });

  it('lista de forma paginada', async () => {
    comprasRepo.findMany.mockResolvedValue({
      data: [{ id: 1, status: 'A_PAGAR' }],
      total: 1,
    });
    const result = await service.list({ page: 1, limit: 20 });
    expect(result.total).toBe(1);
    expect(comprasRepo.findMany).toHaveBeenCalled();
  });

  it('findOne inexistente lança 404', async () => {
    comprasRepo.findById.mockResolvedValue(null);
    await expect(service.findOne(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejeita fornecedor inativo', async () => {
    fornecedoresRepo.findById.mockResolvedValue({
      id: 1,
      nomeRazaoSocial: 'Fornecedor X',
      ativo: false,
    });
    await expect(
      service.create(
        {
          fornecedorId: 1,
          itens: [{ produtoId: 1, quantidade: 1, valorUnitario: 10 }],
        },
        1,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(comprasRepo.createCompra).not.toHaveBeenCalled();
  });

  it('cria compra com fornecedor e produto válidos', async () => {
    fornecedoresRepo.findById.mockResolvedValue({
      id: 1,
      nomeRazaoSocial: 'Fornecedor X',
      ativo: true,
    });
    produtosRepo.findById.mockResolvedValue({ id: 1, ativo: true });
    comprasRepo.createCompra.mockResolvedValue({ id: 1, status: 'A_PAGAR' });

    const result = await service.create(
      {
        fornecedorId: 1,
        itens: [{ produtoId: 1, quantidade: 2, valorUnitario: 50 }],
      },
      1,
    );

    expect(result).toEqual({ id: 1, status: 'A_PAGAR' });
    expect(comprasRepo.createCompra).toHaveBeenCalled();
  });

  it('rejeita pagamento de compra já paga', async () => {
    comprasRepo.findById.mockResolvedValue({
      id: 1,
      status: 'PAGO',
      itens: [],
    });
    await expect(service.pagar(1, {}, 1)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejeita pagamento de compra confirmada', async () => {
    comprasRepo.findById.mockResolvedValue({
      id: 1,
      status: 'CONFIRMADA',
      itens: [],
    });
    await expect(service.pagar(1, {}, 1)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('confirma recebimento apenas de compra paga', async () => {
    comprasRepo.findById.mockResolvedValue({
      id: 1,
      status: 'A_PAGAR',
      itens: [],
    });
    await expect(service.confirmar(1, 1)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('estorna pagamento apenas de compra paga', async () => {
    comprasRepo.findById.mockResolvedValue({
      id: 1,
      status: 'A_PAGAR',
      itens: [],
    });
    await expect(service.estornarPagamento(1)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('cancela compra pendente', async () => {
    comprasRepo.findById.mockResolvedValue({ id: 1, status: 'A_PAGAR' });
    comprasRepo.cancelarCompra.mockResolvedValue({
      id: 1,
      status: 'CANCELADA',
    });
    const result = await service.cancelar(1);
    expect(result.status).toBe('CANCELADA');
  });
});
