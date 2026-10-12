import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FinanceiroService } from './financeiro.service';
import { FinanceiroRepository } from './financeiro.repository';

const makeRepo = () => ({
  findDespesas: vi.fn(),
  findDespesaById: vi.fn(),
  createDespesa: vi.fn(),
  updateDespesa: vi.fn(),
  pagarDespesa: vi.fn(),
  findReceitas: vi.fn(),
  findReceitaById: vi.fn(),
  createReceita: vi.fn(),
  updateReceita: vi.fn(),
  receberReceita: vi.fn(),
  findCategoriasDespesa: vi.fn(),
  createCategoriaDespesa: vi.fn(),
  findCategoriaDespesaByNome: vi.fn(),
  sumDespesasAPagar: vi.fn(),
  sumReceitasAReceber: vi.fn(),
});

describe('FinanceiroService', () => {
  let repo: ReturnType<typeof makeRepo>;
  let service: FinanceiroService;
  beforeEach(() => {
    repo = makeRepo();
    service = new FinanceiroService(repo as unknown as FinanceiroRepository);
  });

  it('despesa inexistente lança 404', async () => {
    repo.findDespesaById.mockResolvedValue(null);
    await expect(service.findDespesa(1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('filtra despesas canceladas e recusa status de outra coleção', async () => {
    repo.findDespesas.mockResolvedValue({ data: [], total: 0 });
    await service.listDespesas({ page: 1, limit: 20, status: 'CANCELADA' });
    expect(repo.findDespesas).toHaveBeenCalledWith(
      { status: 'CANCELADA' },
      0,
      20,
    );
    await expect(
      service.listDespesas({ page: 1, limit: 20, status: 'RECEBIDO' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.listReceitas({ page: 1, limit: 20, status: 'PAGO' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejeita categoria duplicada', async () => {
    repo.findCategoriaDespesaByNome.mockResolvedValue({ id: 1 });
    await expect(
      service.createCategoriaDespesa({ nome: 'Operacional', ativo: true }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('despesa vinculada a compra não pode ser paga pelo financeiro', async () => {
    repo.findDespesaById.mockResolvedValue({
      id: 1,
      compraId: 10,
      status: 'A_PAGAR',
    });
    await expect(service.pagarDespesa(1)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repo.pagarDespesa).not.toHaveBeenCalled();
  });

  it('despesa cancelada não pode ser paga ou editada', async () => {
    repo.findDespesaById.mockResolvedValue({
      id: 1,
      compraId: null,
      status: 'CANCELADA',
    });
    await expect(service.pagarDespesa(1)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.updateDespesa(1, { valor: 2 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repo.pagarDespesa).not.toHaveBeenCalled();
    expect(repo.updateDespesa).not.toHaveBeenCalled();
  });
});
