import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FinanceiroRepository } from './financeiro.repository';
import { buildPaginated } from '../../common/dto/pagination.dto';
import type {
  CreateCategoriaDespesaInput,
  CreateDespesaInput,
  CreateReceitaInput,
  FinanceiroQuery,
  UpdateDespesaInput,
  UpdateReceitaInput,
} from './dto/financeiro.dto';
import type { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class FinanceiroService {
  constructor(private readonly repo: FinanceiroRepository) {}

  async listDespesas({ page, limit, search, status }: FinanceiroQuery) {
    if (status && !['A_PAGAR', 'PAGO', 'CANCELADA'].includes(status)) {
      throw new BadRequestException('Status inválido para despesas.');
    }
    const where: Prisma.DespesaWhereInput = {
      ...(status === 'A_PAGAR' || status === 'PAGO' || status === 'CANCELADA'
        ? { status }
        : {}),
      ...(search
        ? {
            OR: [
              { descricao: { contains: search } },
              { fornecedor: { nomeRazaoSocial: { contains: search } } },
            ],
          }
        : {}),
    };
    const { data, total } = await this.repo.findDespesas(
      where,
      (page - 1) * limit,
      limit,
    );
    return buildPaginated(data, total, { page, limit });
  }

  async findDespesa(id: number) {
    const despesa = await this.repo.findDespesaById(id);
    if (!despesa) throw new NotFoundException('Despesa não encontrada.');
    return despesa;
  }

  createDespesa(input: CreateDespesaInput) {
    return this.repo.createDespesa(input);
  }

  async updateDespesa(id: number, input: UpdateDespesaInput) {
    const despesa = await this.findDespesa(id);
    if (despesa.compraId) {
      throw new BadRequestException(
        'Despesas geradas por compras não podem ser editadas aqui.',
      );
    }
    if (despesa.status !== 'A_PAGAR') {
      throw new BadRequestException(
        'Somente despesas a pagar podem ser editadas.',
      );
    }
    return this.repo.updateDespesa(id, input);
  }

  async pagarDespesa(id: number, dataPagamento?: Date) {
    const despesa = await this.findDespesa(id);
    if (despesa.compraId != null) {
      throw new BadRequestException(
        'Pague esta despesa pelo módulo de compras.',
      );
    }
    if (despesa.status !== 'A_PAGAR') {
      throw new BadRequestException(
        'Somente despesas a pagar podem ser pagas.',
      );
    }
    return this.repo.pagarDespesa(id, dataPagamento ?? new Date());
  }

  async listReceitas({ page, limit, search, status }: FinanceiroQuery) {
    if (status && !['A_RECEBER', 'RECEBIDO'].includes(status)) {
      throw new BadRequestException('Status inválido para receitas.');
    }
    const where: Prisma.ReceitaWhereInput = {
      ...(status === 'A_RECEBER' || status === 'RECEBIDO' ? { status } : {}),
      ...(search
        ? {
            OR: [
              { descricao: { contains: search } },
              { cliente: { nomeCompleto: { contains: search } } },
            ],
          }
        : {}),
    };
    const { data, total } = await this.repo.findReceitas(
      where,
      (page - 1) * limit,
      limit,
    );
    return buildPaginated(data, total, { page, limit });
  }

  async findReceita(id: number) {
    const receita = await this.repo.findReceitaById(id);
    if (!receita) throw new NotFoundException('Receita não encontrada.');
    return receita;
  }

  createReceita(input: CreateReceitaInput) {
    return this.repo.createReceita(input);
  }

  async updateReceita(id: number, input: UpdateReceitaInput) {
    const receita = await this.findReceita(id);
    if (receita.status === 'RECEBIDO') {
      throw new BadRequestException(
        'Receita já recebida não pode ser editada.',
      );
    }
    return this.repo.updateReceita(id, input);
  }

  async receberReceita(id: number, dataRecebimento?: Date) {
    const receita = await this.findReceita(id);
    if (receita.status === 'RECEBIDO') {
      throw new BadRequestException('Receita já foi recebida.');
    }
    return this.repo.receberReceita(id, dataRecebimento ?? new Date());
  }

  listCategoriasDespesa() {
    return this.repo.findCategoriasDespesa();
  }

  async createCategoriaDespesa(input: CreateCategoriaDespesaInput) {
    const existing = await this.repo.findCategoriaDespesaByNome(input.nome);
    if (existing) {
      throw new ConflictException('Já existe uma categoria com este nome.');
    }
    return this.repo.createCategoriaDespesa(input);
  }

  async resumo() {
    const [despesas, receitas] = await Promise.all([
      this.repo.sumDespesasAPagar(),
      this.repo.sumReceitasAReceber(),
    ]);
    return {
      despesasAPagar: {
        total: despesas._sum.valor ?? 0,
        quantidade: despesas._count,
      },
      receitasAReceber: {
        total: receitas._sum.valor ?? 0,
        quantidade: receitas._count,
      },
    };
  }
}
