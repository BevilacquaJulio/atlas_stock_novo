import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { MovimentacoesRepository } from '../src/modules/movimentacoes/movimentacoes.repository';
import { ComprasRepository } from '../src/modules/compras/compras.repository';
import { ComprasService } from '../src/modules/compras/compras.service';
import { ProdutosRepository } from '../src/modules/produtos/produtos.repository';
import { FornecedoresRepository } from '../src/modules/fornecedores/fornecedores.repository';
import { ProjetosRepository } from '../src/modules/projetos/projetos.repository';
import { testDatabase } from './mysql-fixture';

const prisma = testDatabase();
const movement = new MovimentacoesRepository(prisma);
const repo = new ComprasRepository(prisma);
const compras = new ComprasService(repo, new FornecedoresRepository(prisma), new ProdutosRepository(prisma), movement, prisma);
const projects = new ProjetosRepository(prisma);
const prefix = `test-${Date.now()}`;
const products: number[] = [];
let userId: number;
let supplierId: number;
let clientId: number;
let vehicleId: number;

beforeAll(async () => {
  await prisma.$connect();
  userId = (await prisma.usuario.create({ data: { nome: 'Sintético', email: `${prefix}@example.test`, senha: 'unused-test-hash' } })).id;
  supplierId = (await prisma.fornecedor.create({ data: { nomeRazaoSocial: 'Sintético', cpfCnpj: prefix } })).id;
  clientId = (await prisma.cliente.create({ data: { nomeCompleto: 'Sintético', cpfCnpj: prefix } })).id;
  vehicleId = (await prisma.veiculo.create({ data: { clienteId: clientId, placa: 'TEST', marca: 'Teste', modelo: 'Teste' } })).id;
});
afterAll(async () => {
  if (userId) {
    await prisma.projeto.deleteMany({ where: { usuarioId: userId } });
    await prisma.movimentacao.deleteMany({ where: { usuarioId: userId } });
    await prisma.compra.deleteMany({ where: { usuarioId: userId } });
    await prisma.usuario.delete({ where: { id: userId } });
  }
  if (products.length) await prisma.produto.deleteMany({ where: { id: { in: products } } });
  if (supplierId) await prisma.fornecedor.delete({ where: { id: supplierId } });
  if (clientId) await prisma.cliente.delete({ where: { id: clientId } });
  await prisma.$disconnect();
});

async function product() {
  const p = await prisma.produto.create({ data: {
    codigo: `${prefix}-${products.length}`, nome: 'Sintético', unidadeMedida: 'UN', quantidadeEstoque: 10, custoMedio: 10,
  } });
  products.push(p.id);
  return p;
}
async function paidPurchase(productId: number) {
  const c = await compras.create({ fornecedorId: supplierId, itens: [{ produtoId: productId, quantidade: 2, valorUnitario: 20 }] }, userId);
  await compras.pagar(c.id, {}, userId);
  return c.id;
}
function successes(result: PromiseSettledResult<unknown>[]) {
  return result.filter((r) => r.status === 'fulfilled').length;
}

describe('estoque e transições em MySQL isolado', () => {
  it('duas saídas concorrentes não gastam o mesmo saldo', async () => {
    const p = await product();
    const input = { produtoId: p.id, tipo: 'SAIDA' as const, quantidade: 7, custoUnitario: 10, motivo: null, usuarioId: userId };
    expect(successes(await Promise.allSettled([movement.registrar(input), movement.registrar(input)]))).toBe(1);
    expect(Number((await prisma.produto.findUniqueOrThrow({ where: { id: p.id } })).quantidadeEstoque)).toBe(3);
    expect(await prisma.movimentacao.count({ where: { produtoId: p.id } })).toBe(1);
  });

  it('entradas concorrentes preservam quantidade e custo médio', async () => {
    const p = await product();
    const input = { produtoId: p.id, tipo: 'ENTRADA' as const, quantidade: 5, motivo: null, usuarioId: userId };
    await Promise.all([movement.registrar({ ...input, custoUnitario: 20 }), movement.registrar({ ...input, custoUnitario: 30 })]);
    const current = await prisma.produto.findUniqueOrThrow({ where: { id: p.id } });
    expect(Number(current.quantidadeEstoque)).toBe(20);
    expect(Number(current.custoMedio)).toBe(17.5);
    expect(await prisma.movimentacao.count({ where: { produtoId: p.id } })).toBe(2);
  });

  it('dupla confirmação e duplo estorno afetam estoque uma única vez', async () => {
    const p = await product();
    const id = await paidPurchase(p.id);
    expect(successes(await Promise.allSettled([compras.confirmar(id, userId), compras.confirmar(id, userId)]))).toBe(1);
    expect(Number((await prisma.produto.findUniqueOrThrow({ where: { id: p.id } })).quantidadeEstoque)).toBe(12);
    expect(successes(await Promise.allSettled([compras.desconfirmar(id, userId), compras.desconfirmar(id, userId)]))).toBe(1);
    expect(Number((await prisma.produto.findUniqueOrThrow({ where: { id: p.id } })).quantidadeEstoque)).toBe(10);
    expect(await prisma.movimentacao.count({ where: { compraId: id } })).toBe(2);
  });

  it('estorno sem saldo reverte status e não grava movimentação', async () => {
    const p = await product();
    const id = await paidPurchase(p.id);
    await compras.confirmar(id, userId);
    await prisma.produto.update({ where: { id: p.id }, data: { quantidadeEstoque: 0 } });
    await expect(compras.desconfirmar(id, userId)).rejects.toBeInstanceOf(BadRequestException);
    expect((await compras.findOne(id)).status).toBe('CONFIRMADA');
    expect(await prisma.movimentacao.count({ where: { compraId: id } })).toBe(1);
  });

  it('confirmação concorrente com cancelamento preserva uma decisão', async () => {
    const p = await product();
    const id = await paidPurchase(p.id);
    expect(successes(await Promise.allSettled([compras.confirmar(id, userId), compras.cancelar(id)]))).toBe(1);
    const current = await compras.findOne(id);
    const confirmed = current.status === 'CONFIRMADA';
    expect(Number((await prisma.produto.findUniqueOrThrow({ where: { id: p.id } })).quantidadeEstoque)).toBe(confirmed ? 12 : 10);
    expect(current.despesa?.status).toBe(confirmed ? 'PAGO' : 'CANCELADA');
  });

  it('status de projeto concorrente mantém um único histórico verdadeiro', async () => {
    const project = await projects.create({ clienteId: clientId, veiculoId: vehicleId, valorOrcado: 0 }, userId);
    const input = { statusAnterior: 'AGUARDANDO' as const, observacao: null, usuarioId: userId };
    expect(successes(await Promise.allSettled([
      projects.updateStatus(project.id, { ...input, status: 'EM_ANDAMENTO' }),
      projects.updateStatus(project.id, { ...input, status: 'CANCELADO' }),
    ]))).toBe(1);
    expect(await prisma.projetoHistorico.count({ where: { projetoId: project.id } })).toBe(2);
    const current = await projects.findById(project.id);
    if (current?.status === 'CANCELADO') {
      await expect(prisma.$transaction((tx) => projects.lockOpenProject(project.id, tx))).rejects.toBeInstanceOf(BadRequestException);
    }
  });
});
