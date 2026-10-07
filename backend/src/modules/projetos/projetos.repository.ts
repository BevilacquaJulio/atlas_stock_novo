import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '../../../generated/prisma/client';
import type {
  CreateChecklistItemInput,
  CreateConsumoInput,
  CreateProjetoInput,
  UpdateChecklistItemInput,
  UpdateProjetoInput,
} from './dto/projeto.dto';

export const CHECKLIST_PADRAO = [
  'Desmontagem',
  'Preparação do veículo',
  'Aplicação da blindagem',
  'Remontagem',
  'Testes finais',
  'Entrega ao cliente',
];

const projetoInclude = {
  cliente: { select: { id: true, nomeCompleto: true } },
  veiculo: {
    select: { id: true, placa: true, marca: true, modelo: true },
  },
  usuario: { select: { id: true, nome: true } },
  checklist: { orderBy: { ordem: 'asc' as const } },
  historico: {
    orderBy: { createdAt: 'desc' as const },
    include: { usuario: { select: { id: true, nome: true } } },
  },
  consumos: {
    orderBy: { createdAt: 'desc' as const },
    include: {
      produto: { select: { id: true, codigo: true, nome: true } },
      usuario: { select: { id: true, nome: true } },
    },
  },
} satisfies Prisma.ProjetoInclude;

@Injectable()
export class ProjetosRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    where: Prisma.ProjetoWhereInput,
    skip: number,
    take: number,
  ) {
    const [data, total] = await Promise.all([
      this.prisma.projeto.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          cliente: { select: { id: true, nomeCompleto: true } },
          veiculo: {
            select: { id: true, placa: true, marca: true, modelo: true },
          },
          _count: { select: { checklist: true, consumos: true } },
        },
      }),
      this.prisma.projeto.count({ where }),
    ]);
    return { data, total };
  }

  findById(id: number) {
    return this.prisma.projeto.findUnique({
      where: { id },
      include: projetoInclude,
    });
  }

  create(input: CreateProjetoInput, usuarioId: number) {
    const itens =
      input.checklistInicial && input.checklistInicial.length > 0
        ? input.checklistInicial
        : CHECKLIST_PADRAO;

    return this.prisma.$transaction(async (tx) => {
      const projeto = await tx.projeto.create({
        data: {
          clienteId: input.clienteId,
          veiculoId: input.veiculoId,
          descricao: input.descricao ?? null,
          valorOrcado: input.valorOrcado,
          usuarioId,
          checklist: {
            create: itens.map((descricao, ordem) => ({ descricao, ordem })),
          },
        },
      });

      await tx.projetoHistorico.create({
        data: {
          projetoId: projeto.id,
          statusNovo: 'AGUARDANDO',
          observacao: 'Projeto criado.',
          usuarioId,
        },
      });

      return tx.projeto.findUniqueOrThrow({
        where: { id: projeto.id },
        include: projetoInclude,
      });
    });
  }

  update(id: number, input: UpdateProjetoInput) {
    return this.prisma.projeto.update({
      where: { id },
      data: input,
      include: projetoInclude,
    });
  }

  updateStatus(
    id: number,
    data: {
      status: 'AGUARDANDO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';
      statusAnterior:
        | 'AGUARDANDO'
        | 'EM_ANDAMENTO'
        | 'CONCLUIDO'
        | 'CANCELADO'
        | null;
      observacao: string | null;
      usuarioId: number;
      dataInicio?: Date | null;
      dataConclusao?: Date | null;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.projeto.update({
        where: { id },
        data: {
          status: data.status,
          ...(data.dataInicio !== undefined ? { dataInicio: data.dataInicio } : {}),
          ...(data.dataConclusao !== undefined
            ? { dataConclusao: data.dataConclusao }
            : {}),
        },
      });

      await tx.projetoHistorico.create({
        data: {
          projetoId: id,
          statusAnterior: data.statusAnterior,
          statusNovo: data.status,
          observacao: data.observacao,
          usuarioId: data.usuarioId,
        },
      });

      return tx.projeto.findUniqueOrThrow({
        where: { id },
        include: projetoInclude,
      });
    });
  }

  softDelete(id: number) {
    return this.prisma.projeto.update({
      where: { id },
      data: { ativo: false },
      include: projetoInclude,
    });
  }

  addChecklistItem(projetoId: number, input: CreateChecklistItemInput) {
    return this.prisma.projetoChecklistItem.create({
      data: {
        projetoId,
        descricao: input.descricao,
        ordem: input.ordem ?? 0,
      },
    });
  }

  updateChecklistItem(itemId: number, input: UpdateChecklistItemInput) {
    return this.prisma.projetoChecklistItem.update({
      where: { id: itemId },
      data: {
        ...input,
        ...(input.concluido !== undefined
          ? { concluidoEm: input.concluido ? new Date() : null }
          : {}),
      },
    });
  }

  deleteChecklistItem(itemId: number) {
    return this.prisma.projetoChecklistItem.delete({ where: { id: itemId } });
  }

  findChecklistItem(itemId: number, projetoId: number) {
    return this.prisma.projetoChecklistItem.findFirst({
      where: { id: itemId, projetoId },
    });
  }

  createConsumo(
    projetoId: number,
    input: CreateConsumoInput,
    usuarioId: number,
    tx?: Prisma.TransactionClient,
  ) {
    const valorTotal = input.quantidade * input.valorUnitario;
    const client = tx ?? this.prisma;
    return client.projetoConsumo.create({
      data: {
        projetoId,
        tipo: input.tipo,
        produtoId: input.tipo === 'PRODUTO' ? input.produtoId : null,
        descricao: input.tipo === 'SERVICO' ? input.descricao : null,
        quantidade: input.quantidade,
        valorUnitario: input.valorUnitario,
        valorTotal,
        usuarioId,
      },
      include: {
        produto: { select: { id: true, codigo: true, nome: true } },
        usuario: { select: { id: true, nome: true } },
      },
    });
  }

  countReferencias(id: number) {
    return Promise.all([
      this.prisma.projetoConsumo.count({ where: { projetoId: id } }),
      this.prisma.movimentacao.count({ where: { projetoId: id } }),
    ]).then(([consumos, movimentacoes]) => consumos + movimentacoes);
  }
}
