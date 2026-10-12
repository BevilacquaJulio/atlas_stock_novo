import { BadRequestException, Injectable } from '@nestjs/common';
import { MAX_MONEY, MAX_QUANTITY } from '../../common/validators/bounds';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma, Produto } from '../../../generated/prisma/client';

type RegistrarParams = {
  produtoId: number;
  tipo: 'ENTRADA' | 'SAIDA';
  quantidade: number;
  custoUnitario: number;
  motivo: string | null;
  usuarioId: number;
  compraId?: number;
  projetoId?: number;
  /**
   * Saída que desfaz uma entrada (estorno de recebimento): além de tirar a
   * quantidade, remove o valor da entrada do custo médio.
   */
  estornoDeEntrada?: boolean;
};

/**
 * Custo médio depois de desfazer uma entrada na média ponderada:
 * (saldo × custo médio − quantidade × custo da entrada) ÷ saldo restante.
 * Sem outras movimentações no meio, volta exatamente ao custo anterior à
 * entrada. Sem saldo restante, o custo não se aplica e fica como está (a
 * próxima entrada o redefine). Se saídas posteriores deixaram menos valor em
 * estoque do que a entrada representa, o resultado seria negativo: o estorno é
 * recusado (CUSTO_MEDIO_INVALIDO) em vez de gravar um custo sem sentido.
 */
export function custoMedioAposEstorno(
  estoque: number,
  custoMedio: number,
  quantidade: number,
  custoEntrada: number,
): number {
  const restante = estoque - quantidade;
  if (restante <= 0) return custoMedio;
  const valorRestante = estoque * custoMedio - quantidade * custoEntrada;
  // Tolerância de meio centavo para o arredondamento do custo gravado.
  if (valorRestante < -0.005) throw new Error('CUSTO_MEDIO_INVALIDO');
  return Math.max(valorRestante, 0) / restante;
}

@Injectable()
export class MovimentacoesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    where: Prisma.MovimentacaoWhereInput,
    skip: number,
    take: number,
  ) {
    const [data, total] = await Promise.all([
      this.prisma.movimentacao.findMany({
        where,
        skip,
        take,
        orderBy: { dataMovimentacao: 'desc' },
        include: {
          produto: { select: { id: true, codigo: true, nome: true } },
          usuario: { select: { id: true, nome: true } },
        },
      }),
      this.prisma.movimentacao.count({ where }),
    ]);
    return { data, total };
  }

  /**
   * Registra a movimentação e ajusta o estoque do produto atomicamente.
   * ENTRADA: soma ao estoque e recalcula o custo médio ponderado.
   * SAIDA: subtrai do estoque (valida saldo).
   * Aceita um client de transação externo para composição com outras operações.
   */
  registrar(params: RegistrarParams, tx?: Prisma.TransactionClient) {
    const run = (client: Prisma.TransactionClient) =>
      this.executarRegistro(client, params);

    if (tx) return run(tx);
    return this.prisma.$transaction(run);
  }

  private async executarRegistro(
    tx: Prisma.TransactionClient,
    params: RegistrarParams,
  ) {
    const {
      produtoId,
      tipo,
      quantidade,
      custoUnitario,
      motivo,
      usuarioId,
      compraId,
      projetoId,
      estornoDeEntrada,
    } = params;

    // Lock e leitura corrente evitam saldo obsoleto após esperar outra transação.
    const [produto] = await tx.$queryRaw<
      Array<Pick<Produto, 'quantidadeEstoque' | 'custoMedio'>>
    >`
      SELECT quantidade_estoque AS quantidadeEstoque, custo_medio AS custoMedio
      FROM produtos WHERE id = ${produtoId} FOR UPDATE
    `;
    if (!produto) {
      throw new Error('PRODUTO_NAO_ENCONTRADO');
    }

    const estoqueAtual = Number(produto.quantidadeEstoque);
    const custoMedioAtual = Number(produto.custoMedio);

    let novoEstoque: number;
    let novoCustoMedio = custoMedioAtual;

    if (tipo === 'ENTRADA') {
      novoEstoque = estoqueAtual + quantidade;
      const valorAtual = estoqueAtual * custoMedioAtual;
      const valorEntrada = quantidade * custoUnitario;
      novoCustoMedio =
        novoEstoque > 0
          ? (valorAtual + valorEntrada) / novoEstoque
          : custoUnitario;
    } else {
      if (estoqueAtual < quantidade) {
        throw new Error('ESTOQUE_INSUFICIENTE');
      }
      novoEstoque = estoqueAtual - quantidade;
      if (estornoDeEntrada) {
        novoCustoMedio = custoMedioAposEstorno(
          estoqueAtual,
          custoMedioAtual,
          quantidade,
          custoUnitario,
        );
      }
    }

    if (novoEstoque > MAX_QUANTITY || quantidade * custoUnitario > MAX_MONEY) {
      throw new BadRequestException(
        'Movimentação excede o limite de estoque ou valor permitido.',
      );
    }

    const movimentacao = await tx.movimentacao.create({
      data: {
        produtoId,
        tipo,
        quantidade,
        custoUnitario,
        valorTotal: quantidade * custoUnitario,
        motivo,
        usuarioId,
        compraId: compraId ?? null,
        projetoId: projetoId ?? null,
      },
    });

    await tx.produto.update({
      where: { id: produtoId },
      data: {
        quantidadeEstoque: novoEstoque,
        custoMedio: novoCustoMedio,
      },
    });

    return movimentacao;
  }
}
