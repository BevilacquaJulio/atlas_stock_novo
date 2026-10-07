import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class ProdutosRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(where: Prisma.ProdutoWhereInput, skip: number, take: number) {
    const [data, total] = await Promise.all([
      this.prisma.produto.findMany({
        where,
        skip,
        take,
        orderBy: { nome: 'asc' },
        include: { categoria: { select: { id: true, nome: true } } },
      }),
      this.prisma.produto.count({ where }),
    ]);
    return { data, total };
  }

  findById(id: number) {
    return this.prisma.produto.findUnique({
      where: { id },
      include: { categoria: { select: { id: true, nome: true } } },
    });
  }

  findByCodigo(codigo: string) {
    return this.prisma.produto.findUnique({ where: { codigo } });
  }

  update(id: number, data: Prisma.ProdutoUpdateInput) {
    return this.prisma.produto.update({ where: { id }, data });
  }

  /** Cria o produto e, se houver estoque inicial, registra a movimentação de ENTRADA. */
  createWithInitialStock(
    data: Prisma.ProdutoCreateInput,
    estoqueInicial: number,
    valorUnitario: number,
    usuarioId: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const produto = await tx.produto.create({ data });
      if (estoqueInicial > 0) {
        await tx.movimentacao.create({
          data: {
            produtoId: produto.id,
            tipo: 'ENTRADA',
            quantidade: estoqueInicial,
            custoUnitario: valorUnitario,
            valorTotal: estoqueInicial * valorUnitario,
            motivo: 'Estoque inicial',
            usuarioId,
          },
        });
      }
      return produto;
    });
  }

  countReferences(id: number) {
    return this.prisma.movimentacao.count({ where: { produtoId: id } });
  }

  delete(id: number) {
    return this.prisma.produto.delete({ where: { id } });
  }
}
