import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { MovimentacoesRepository } from '../src/modules/movimentacoes/movimentacoes.repository';
import { ComprasRepository } from '../src/modules/compras/compras.repository';
import { ComprasService } from '../src/modules/compras/compras.service';
import { ProdutosRepository } from '../src/modules/produtos/produtos.repository';
import { FornecedoresRepository } from '../src/modules/fornecedores/fornecedores.repository';
import { ProjetosRepository } from '../src/modules/projetos/projetos.repository';
import { testDatabase } from './mysql-fixture';
import { MAX_QUANTITY } from '../src/common/validators/bounds';
import { VeiculosRepository } from '../src/modules/veiculos/veiculos.repository';
import { ClientesRepository } from '../src/modules/clientes/clientes.repository';
import { ProjetosService } from '../src/modules/projetos/projetos.service';

const prisma = testDatabase();
const movement = new MovimentacoesRepository(prisma);
const repo = new ComprasRepository(prisma);
const compras = new ComprasService(
  repo,
  new FornecedoresRepository(prisma),
  new ProdutosRepository(prisma),
  movement,
  prisma,
);
const projects = new ProjetosRepository(prisma);
const prefix = `test-${Date.now()}`;
const products: number[] = [];
let userId: number;
let supplierId: number;
let clientId: number;
let vehicleId: number;

beforeAll(async () => {
  await prisma.$connect();
  userId = (
    await prisma.usuario.create({
      data: {
        nome: 'Sintético',
        email: `${prefix}@example.test`,
        senha: 'unused-test-hash',
      },
    })
  ).id;
  supplierId = (
    await prisma.fornecedor.create({
      data: { nomeRazaoSocial: 'Sintético', cpfCnpj: prefix },
    })
  ).id;
  clientId = (
    await prisma.cliente.create({
      data: { nomeCompleto: 'Sintético', cpfCnpj: prefix },
    })
  ).id;
  vehicleId = (
    await prisma.veiculo.create({
      data: {
        clienteId: clientId,
        placa: 'TEST',
        marca: 'Teste',
        modelo: 'Teste',
      },
    })
  ).id;
});
afterAll(async () => {
  if (userId) {
    await prisma.projeto.deleteMany({ where: { usuarioId: userId } });
    await prisma.movimentacao.deleteMany({ where: { usuarioId: userId } });
    await prisma.compra.deleteMany({ where: { usuarioId: userId } });
    await prisma.usuario.delete({ where: { id: userId } });
  }
  if (products.length)
    await prisma.produto.deleteMany({ where: { id: { in: products } } });
  if (supplierId) await prisma.fornecedor.delete({ where: { id: supplierId } });
  if (clientId) await prisma.cliente.delete({ where: { id: clientId } });
  await prisma.$disconnect();
});

async function product() {
  const p = await prisma.produto.create({
    data: {
      codigo: `${prefix}-${products.length}`,
      nome: 'Sintético',
      unidadeMedida: 'UN',
      quantidadeEstoque: 10,
      custoMedio: 10,
    },
  });
  products.push(p.id);
  return p;
}
async function paidPurchase(productId: number) {
  const c = await compras.create(
    {
      fornecedorId: supplierId,
      itens: [{ produtoId: productId, quantidade: 2, valorUnitario: 20 }],
    },
    userId,
  );
  await compras.pagar(c.id, {}, userId);
  return c.id;
}
async function receivedPurchase(
  productId: number,
  quantidade: number,
  valorUnitario: number,
) {
  const c = await compras.create(
    {
      fornecedorId: supplierId,
      itens: [{ produtoId: productId, quantidade, valorUnitario }],
    },
    userId,
  );
  await compras.pagar(c.id, {}, userId);
  await compras.confirmar(c.id, userId);
  return c.id;
}
async function saldo(productId: number) {
  const p = await prisma.produto.findUniqueOrThrow({
    where: { id: productId },
  });
  return {
    quantidade: Number(p.quantidadeEstoque),
    custoMedio: Number(p.custoMedio),
  };
}
function successes(result: PromiseSettledResult<unknown>[]) {
  return result.filter((r) => r.status === 'fulfilled').length;
}

describe('estoque e transições em MySQL isolado', () => {
  it('recusa overflow de saldo sem gravar movimento', async () => {
    const p = await product();
    await prisma.produto.update({
      where: { id: p.id },
      data: { quantidadeEstoque: MAX_QUANTITY },
    });
    await expect(
      movement.registrar({
        produtoId: p.id,
        tipo: 'ENTRADA',
        quantidade: 1,
        custoUnitario: 1,
        motivo: null,
        usuarioId: userId,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(
      await prisma.movimentacao.count({ where: { produtoId: p.id } }),
    ).toBe(0);
    expect(
      Number(
        (await prisma.produto.findUniqueOrThrow({ where: { id: p.id } }))
          .quantidadeEstoque,
      ),
    ).toBe(MAX_QUANTITY);
  });
  it('duas saídas concorrentes não gastam o mesmo saldo', async () => {
    const p = await product();
    const input = {
      produtoId: p.id,
      tipo: 'SAIDA' as const,
      quantidade: 7,
      custoUnitario: 10,
      motivo: null,
      usuarioId: userId,
    };
    expect(
      successes(
        await Promise.allSettled([
          movement.registrar(input),
          movement.registrar(input),
        ]),
      ),
    ).toBe(1);
    expect(
      Number(
        (await prisma.produto.findUniqueOrThrow({ where: { id: p.id } }))
          .quantidadeEstoque,
      ),
    ).toBe(3);
    expect(
      await prisma.movimentacao.count({ where: { produtoId: p.id } }),
    ).toBe(1);
  });

  it('entradas concorrentes preservam quantidade e custo médio', async () => {
    const p = await product();
    const input = {
      produtoId: p.id,
      tipo: 'ENTRADA' as const,
      quantidade: 5,
      motivo: null,
      usuarioId: userId,
    };
    await Promise.all([
      movement.registrar({ ...input, custoUnitario: 20 }),
      movement.registrar({ ...input, custoUnitario: 30 }),
    ]);
    const current = await prisma.produto.findUniqueOrThrow({
      where: { id: p.id },
    });
    expect(Number(current.quantidadeEstoque)).toBe(20);
    expect(Number(current.custoMedio)).toBe(17.5);
    expect(
      await prisma.movimentacao.count({ where: { produtoId: p.id } }),
    ).toBe(2);
  });

  it('dupla confirmação e duplo estorno afetam estoque uma única vez', async () => {
    const p = await product();
    const id = await paidPurchase(p.id);
    expect(
      successes(
        await Promise.allSettled([
          compras.confirmar(id, userId),
          compras.confirmar(id, userId),
        ]),
      ),
    ).toBe(1);
    expect(
      Number(
        (await prisma.produto.findUniqueOrThrow({ where: { id: p.id } }))
          .quantidadeEstoque,
      ),
    ).toBe(12);
    expect(
      successes(
        await Promise.allSettled([
          compras.desconfirmar(id, userId),
          compras.desconfirmar(id, userId),
        ]),
      ),
    ).toBe(1);
    expect(
      Number(
        (await prisma.produto.findUniqueOrThrow({ where: { id: p.id } }))
          .quantidadeEstoque,
      ),
    ).toBe(10);
    expect(await prisma.movimentacao.count({ where: { compraId: id } })).toBe(
      2,
    );
  });

  it('estorno de recebimento sem operações no meio volta ao custo médio anterior', async () => {
    const p = await product(); // 10 un a R$ 10
    const id = await receivedPurchase(p.id, 10, 20);
    expect(await saldo(p.id)).toEqual({ quantidade: 20, custoMedio: 15 });

    await compras.desconfirmar(id, userId);

    expect(await saldo(p.id)).toEqual({ quantidade: 10, custoMedio: 10 });
    expect((await compras.findOne(id)).status).toBe('PAGO');
  });

  it('estorno com outra entrada no meio mantém o custo dos lotes que ficaram', async () => {
    const p = await product(); // 10 un a R$ 10
    const primeira = await receivedPurchase(p.id, 10, 20); // 20 un a R$ 15
    await receivedPurchase(p.id, 10, 30); // 30 un a R$ 20

    await compras.desconfirmar(primeira, userId);

    // Restam os lotes de R$ 10 e R$ 30: média de R$ 20.
    expect(await saldo(p.id)).toEqual({ quantidade: 20, custoMedio: 20 });
  });

  it('recusa estorno que deixaria custo médio inválido após consumo, sem alterar nada', async () => {
    const p = await prisma.produto.create({
      data: {
        codigo: `${prefix}-custo`,
        nome: 'Sintético',
        unidadeMedida: 'UN',
        quantidadeEstoque: 100,
        custoMedio: 1,
      },
    });
    products.push(p.id);
    const id = await receivedPurchase(p.id, 10, 100); // 110 un a R$ 10
    await movement.registrar({
      produtoId: p.id,
      tipo: 'SAIDA',
      quantidade: 50,
      custoUnitario: 10,
      motivo: 'consumo sintético',
      usuarioId: userId,
    }); // 60 un a R$ 10 = R$ 600, menos que os R$ 1.000 da entrada

    await expect(compras.desconfirmar(id, userId)).rejects.toThrow(
      /custo médio ficaria inválido/,
    );
    expect(await saldo(p.id)).toEqual({ quantidade: 60, custoMedio: 10 });
    expect((await compras.findOne(id)).status).toBe('CONFIRMADA');
    expect(await prisma.movimentacao.count({ where: { compraId: id } })).toBe(
      1,
    );
  });

  it('estorno sem saldo reverte status e não grava movimentação', async () => {
    const p = await product();
    const id = await paidPurchase(p.id);
    await compras.confirmar(id, userId);
    await prisma.produto.update({
      where: { id: p.id },
      data: { quantidadeEstoque: 0 },
    });
    await expect(compras.desconfirmar(id, userId)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect((await compras.findOne(id)).status).toBe('CONFIRMADA');
    expect(await prisma.movimentacao.count({ where: { compraId: id } })).toBe(
      1,
    );
  });

  it('confirmação concorrente com cancelamento preserva uma decisão', async () => {
    const p = await product();
    const id = await paidPurchase(p.id);
    expect(
      successes(
        await Promise.allSettled([
          compras.confirmar(id, userId),
          compras.cancelar(id),
        ]),
      ),
    ).toBe(1);
    const current = await compras.findOne(id);
    const confirmed = current.status === 'CONFIRMADA';
    expect(
      Number(
        (await prisma.produto.findUniqueOrThrow({ where: { id: p.id } }))
          .quantidadeEstoque,
      ),
    ).toBe(confirmed ? 12 : 10);
    expect(current.despesa?.status).toBe(confirmed ? 'PAGO' : 'CANCELADA');
  });

  it('status de projeto concorrente mantém um único histórico verdadeiro', async () => {
    const project = await projects.create(
      { clienteId: clientId, veiculoId: vehicleId, valorOrcado: 0 },
      userId,
    );
    const input = {
      statusAnterior: 'AGUARDANDO' as const,
      observacao: null,
      usuarioId: userId,
    };
    expect(
      successes(
        await Promise.allSettled([
          projects.updateStatus(project.id, {
            ...input,
            status: 'EM_ANDAMENTO',
          }),
          projects.updateStatus(project.id, { ...input, status: 'CANCELADO' }),
        ]),
      ),
    ).toBe(1);
    expect(
      await prisma.projetoHistorico.count({ where: { projetoId: project.id } }),
    ).toBe(2);
    const current = await projects.findById(project.id);
    if (current?.status === 'CANCELADO') {
      await expect(
        prisma.$transaction((tx) => projects.lockOpenProject(project.id, tx)),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it('checklist e encerramento concorrentes preservam o estado final e impedem edições posteriores', async () => {
    const project = await projects.create(
      { clienteId: clientId, veiculoId: vehicleId, valorOrcado: 0 },
      userId,
    );
    const item = await projects.addChecklistItem(project.id, {
      descricao: 'Verificação sintética',
    });
    await projects.updateChecklistItem(
      item.id,
      { concluido: true },
      project.id,
    );
    await projects.updateChecklistItem(
      item.id,
      { concluido: false },
      project.id,
    );
    await projects.deleteChecklistItem(item.id, project.id);
    const first = project.checklist[0];
    await Promise.allSettled([
      projects.updateChecklistItem(first.id, { concluido: true }, project.id),
      projects.updateStatus(project.id, {
        status: 'CONCLUIDO',
        statusAnterior: 'AGUARDANDO',
        observacao: null,
        usuarioId: userId,
      }),
    ]);
    expect((await projects.findById(project.id))?.status).toBe('CONCLUIDO');
    await expect(
      projects.addChecklistItem(project.id, { descricao: 'Indevido' }),
    ).rejects.toThrow();
    await expect(
      projects.updateChecklistItem(first.id, { concluido: false }, project.id),
    ).rejects.toThrow();
    await expect(
      projects.deleteChecklistItem(first.id, project.id),
    ).rejects.toThrow();
  });

  it('não troca o cliente de veículo que possui projetos e recusa cliente inativo', async () => {
    await projects.create(
      { clienteId: clientId, veiculoId: vehicleId, valorOrcado: 0 },
      userId,
    );
    const other = await prisma.cliente.create({
      data: { nomeCompleto: `${prefix} outro`, cpfCnpj: '52998224725' },
    });
    const vehicles = new VeiculosRepository(prisma);
    try {
      await expect(
        vehicles.update(vehicleId, { cliente: { connect: { id: other.id } } }),
      ).rejects.toThrow('projetos vinculados');
      await prisma.cliente.update({
        where: { id: other.id },
        data: { ativo: false },
      });
      await expect(
        vehicles.update(vehicleId, { cliente: { connect: { id: other.id } } }),
      ).rejects.toThrow('inativo');
      await vehicles.update(vehicleId, {
        modelo: 'Modelo sintético atualizado',
      });
      expect((await vehicles.findById(vehicleId))?.clienteId).toBe(clientId);
    } finally {
      await prisma.cliente.delete({ where: { id: other.id } });
    }
  });

  it('consumo usa custo lido sob lock mesmo se o produto mudou após a validação inicial', async () => {
    const p = await product();
    const project = await projects.create(
      { clienteId: clientId, veiculoId: vehicleId, valorOrcado: 0 },
      userId,
    );
    const productsRepo = new ProdutosRepository(prisma);
    const original = productsRepo.findById.bind(productsRepo);
    const staleProducts = {
      findById: async (id: number) => {
        const stale = await original(id);
        await prisma.produto.update({
          where: { id },
          data: { custoMedio: 20 },
        });
        return stale;
      },
    };
    const service = new ProjetosService(
      projects,
      new ClientesRepository(prisma),
      new VeiculosRepository(prisma),
      staleProducts as unknown as ProdutosRepository,
      movement,
      prisma,
    );
    await service.registrarConsumo(
      project.id,
      { tipo: 'PRODUTO', produtoId: p.id, quantidade: 1, valorUnitario: 10 },
      userId,
    );
    const registered = await prisma.movimentacao.findFirstOrThrow({
      where: { projetoId: project.id, produtoId: p.id },
    });
    expect(Number(registered.custoUnitario)).toBe(20);
    expect((await saldo(p.id)).quantidade).toBe(9);
    await service.registrarConsumo(
      project.id,
      {
        tipo: 'SERVICO',
        descricao: 'Serviço sintético',
        quantidade: 0.5,
        valorUnitario: 0.01,
      },
      userId,
    );
    await expect(
      service.registrarConsumo(
        project.id,
        {
          tipo: 'PRODUTO',
          produtoId: p.id,
          quantidade: 1000,
          valorUnitario: 10,
        },
        userId,
      ),
    ).rejects.toThrow('Estoque insuficiente');
  });
});
