import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { FinanceiroRepository } from '../src/modules/financeiro/financeiro.repository';
import { FinanceiroService } from '../src/modules/financeiro/financeiro.service';
import { testDatabase } from './mysql-fixture';

const prisma = testDatabase();
const repo = new FinanceiroRepository(prisma);
const service = new FinanceiroService(repo, new JwtService(), new ConfigService());
const expenses: number[] = [];
const revenues: number[] = [];
let userId: number;
let supplierId: number;
const marker = `fin-${Date.now()}`;

beforeAll(async () => {
  await prisma.$connect();
  userId = (await prisma.usuario.create({ data: { nome: 'Sintético', email: `${marker}@example.test`, senha: 'unused' } })).id;
  supplierId = (await prisma.fornecedor.create({ data: { nomeRazaoSocial: 'Sintético', cpfCnpj: marker } })).id;
});
afterAll(async () => {
  if (expenses.length) await prisma.despesa.deleteMany({ where: { id: { in: expenses } } });
  if (revenues.length) await prisma.receita.deleteMany({ where: { id: { in: revenues } } });
  if (userId) {
    await prisma.compra.deleteMany({ where: { usuarioId: userId } });
    await prisma.usuario.delete({ where: { id: userId } });
  }
  if (supplierId) await prisma.fornecedor.delete({ where: { id: supplierId } });
  await prisma.$disconnect();
});

async function expense(status: 'A_PAGAR' | 'CANCELADA' = 'A_PAGAR') {
  const row = await prisma.despesa.create({ data: { descricao: marker, valor: 10, status } });
  expenses.push(row.id);
  return row;
}

describe('financeiro em MySQL isolado', () => {
  it('despesa de compra não é paga pelo caminho avulso nem modifica compra', async () => {
    const compra = await prisma.compra.create({ data: {
      fornecedorId: supplierId, usuarioId: userId, valorTotal: 10,
      despesa: { create: { descricao: marker, valor: 10 } },
    }, include: { despesa: true } });
    await expect(service.pagarDespesa(compra.despesa!.id)).rejects.toBeInstanceOf(BadRequestException);
    await expect(repo.pagarDespesa(compra.despesa!.id, new Date())).rejects.toBeInstanceOf(BadRequestException);
    expect((await prisma.compra.findUniqueOrThrow({ where: { id: compra.id } })).status).toBe('A_PAGAR');
    expect((await repo.findDespesaById(compra.despesa!.id))?.status).toBe('A_PAGAR');
  });

  it('despesa cancelada permanece cancelada após pagamento recusado', async () => {
    const row = await expense('CANCELADA');
    await expect(service.pagarDespesa(row.id)).rejects.toBeInstanceOf(BadRequestException);
    await expect(repo.pagarDespesa(row.id, new Date())).rejects.toBeInstanceOf(BadRequestException);
    expect((await repo.findDespesaById(row.id))?.status).toBe('CANCELADA');
  });

  it('pagamento concorrente acontece uma vez e edição posterior é recusada', async () => {
    const row = await expense();
    const result = await Promise.allSettled([repo.pagarDespesa(row.id, new Date()), repo.pagarDespesa(row.id, new Date())]);
    expect(result.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    await expect(repo.updateDespesa(row.id, { valor: 99 })).rejects.toBeInstanceOf(BadRequestException);
    const current = await repo.findDespesaById(row.id);
    expect(current?.status).toBe('PAGO');
    expect(Number(current?.valor)).toBe(10);
  });

  it('recebimento concorrente acontece uma vez e protege valor quitado', async () => {
    const row = await prisma.receita.create({ data: { descricao: marker, valor: 10 } });
    revenues.push(row.id);
    const result = await Promise.allSettled([repo.receberReceita(row.id, new Date()), repo.receberReceita(row.id, new Date())]);
    expect(result.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    await expect(repo.updateReceita(row.id, { valor: 99 })).rejects.toBeInstanceOf(BadRequestException);
    expect(Number((await repo.findReceitaById(row.id))?.valor)).toBe(10);
  });
});
