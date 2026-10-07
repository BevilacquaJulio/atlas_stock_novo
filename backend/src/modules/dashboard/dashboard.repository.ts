import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getCounts() {
    const [
      clientes,
      produtos,
      projetosAtivos,
      projetosEmAndamento,
      comprasAPagar,
      despesasAPagar,
      receitasAReceber,
      produtosEstoqueBaixo,
    ] = await Promise.all([
      this.prisma.cliente.count({ where: { ativo: true } }),
      this.prisma.produto.count({ where: { ativo: true } }),
      this.prisma.projeto.count({ where: { ativo: true } }),
      this.prisma.projeto.count({
        where: { ativo: true, status: 'EM_ANDAMENTO' },
      }),
      this.prisma.compra.count({ where: { status: 'A_PAGAR' } }),
      this.prisma.despesa.aggregate({
        where: { status: 'A_PAGAR' },
        _sum: { valor: true },
        _count: true,
      }),
      this.prisma.receita.aggregate({
        where: { status: 'A_RECEBER' },
        _sum: { valor: true },
        _count: true,
      }),
      this.prisma.produto.findMany({
        where: { ativo: true, quantidadeEstoque: { lte: 5 } },
        take: 10,
        orderBy: { quantidadeEstoque: 'asc' },
        select: {
          id: true,
          codigo: true,
          nome: true,
          quantidadeEstoque: true,
          unidadeMedida: true,
        },
      }),
    ]);

    return {
      clientes,
      produtos,
      projetosAtivos,
      projetosEmAndamento,
      comprasAPagar,
      despesasAPagar: {
        quantidade: despesasAPagar._count,
        total: despesasAPagar._sum.valor ?? 0,
      },
      receitasAReceber: {
        quantidade: receitasAReceber._count,
        total: receitasAReceber._sum.valor ?? 0,
      },
      produtosEstoqueBaixo,
    };
  }

  recentProjetos() {
    return this.prisma.projeto.findMany({
      where: { ativo: true },
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: {
        cliente: { select: { nomeCompleto: true } },
        veiculo: { select: { placa: true } },
      },
    });
  }
}
