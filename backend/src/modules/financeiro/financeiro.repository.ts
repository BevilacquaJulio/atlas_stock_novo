import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '../../../generated/prisma/client';
import type {
  CreateCategoriaDespesaInput,
  CreateDespesaInput,
  CreateReceitaInput,
  UpdateDespesaInput,
  UpdateReceitaInput,
} from './dto/financeiro.dto';

const despesaInclude = {
  fornecedor: { select: { id: true, nomeRazaoSocial: true } },
  categoriaDespesa: { select: { id: true, nome: true } },
  compra: { select: { id: true, status: true } },
  projeto: { select: { id: true, status: true } },
} satisfies Prisma.DespesaInclude;

const receitaInclude = {
  cliente: { select: { id: true, nomeCompleto: true } },
  projeto: {
    select: { id: true, status: true, veiculo: { select: { placa: true } } },
  },
} satisfies Prisma.ReceitaInclude;

@Injectable()
export class FinanceiroRepository {
  constructor(private readonly prisma: PrismaService) {}

  getConfig() {
    return this.prisma.configSistema.findUnique({ where: { id: 1 } });
  }

  upsertConfigFinanceiroSenha(hash: string) {
    return this.prisma.configSistema.upsert({
      where: { id: 1 },
      update: { financeiroSenhaHash: hash },
      create: { id: 1, financeiroSenhaHash: hash },
    });
  }

  async verifyFinanceiroSenha(senha: string): Promise<boolean> {
    const config = await this.getConfig();
    if (!config?.financeiroSenhaHash) return false;
    return bcrypt.compare(senha, config.financeiroSenhaHash);
  }

  async findDespesas(
    where: Prisma.DespesaWhereInput,
    skip: number,
    take: number,
  ) {
    const [data, total] = await Promise.all([
      this.prisma.despesa.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: despesaInclude,
      }),
      this.prisma.despesa.count({ where }),
    ]);
    return { data, total };
  }

  findDespesaById(id: number) {
    return this.prisma.despesa.findUnique({
      where: { id },
      include: despesaInclude,
    });
  }

  createDespesa(input: CreateDespesaInput) {
    return this.prisma.despesa.create({
      data: {
        descricao: input.descricao,
        valor: input.valor,
        dataVencimento: input.dataVencimento ?? null,
        fornecedorId: input.fornecedorId ?? null,
        categoriaDespesaId: input.categoriaDespesaId ?? null,
        projetoId: input.projetoId ?? null,
      },
      include: despesaInclude,
    });
  }

  updateDespesa(id: number, input: UpdateDespesaInput) {
    return this.prisma.despesa.update({
      where: { id },
      data: input,
      include: despesaInclude,
    });
  }

  pagarDespesa(id: number, dataPagamento: Date) {
    return this.prisma.despesa.update({
      where: { id },
      data: { status: 'PAGO', dataPagamento },
      include: despesaInclude,
    });
  }

  async findReceitas(
    where: Prisma.ReceitaWhereInput,
    skip: number,
    take: number,
  ) {
    const [data, total] = await Promise.all([
      this.prisma.receita.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: receitaInclude,
      }),
      this.prisma.receita.count({ where }),
    ]);
    return { data, total };
  }

  findReceitaById(id: number) {
    return this.prisma.receita.findUnique({
      where: { id },
      include: receitaInclude,
    });
  }

  createReceita(input: CreateReceitaInput) {
    return this.prisma.receita.create({
      data: {
        descricao: input.descricao,
        valor: input.valor,
        dataVencimento: input.dataVencimento ?? null,
        clienteId: input.clienteId ?? null,
        projetoId: input.projetoId ?? null,
      },
      include: receitaInclude,
    });
  }

  updateReceita(id: number, input: UpdateReceitaInput) {
    return this.prisma.receita.update({
      where: { id },
      data: input,
      include: receitaInclude,
    });
  }

  receberReceita(id: number, dataRecebimento: Date) {
    return this.prisma.receita.update({
      where: { id },
      data: { status: 'RECEBIDO', dataRecebimento },
      include: receitaInclude,
    });
  }

  findCategoriasDespesa() {
    return this.prisma.categoriaDespesa.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
    });
  }

  createCategoriaDespesa(input: CreateCategoriaDespesaInput) {
    return this.prisma.categoriaDespesa.create({ data: input });
  }

  findCategoriaDespesaByNome(nome: string) {
    return this.prisma.categoriaDespesa.findUnique({ where: { nome } });
  }

  sumDespesasAPagar() {
    return this.prisma.despesa.aggregate({
      where: { status: 'A_PAGAR' },
      _sum: { valor: true },
      _count: true,
    });
  }

  sumReceitasAReceber() {
    return this.prisma.receita.aggregate({
      where: { status: 'A_RECEBER' },
      _sum: { valor: true },
      _count: true,
    });
  }
}
