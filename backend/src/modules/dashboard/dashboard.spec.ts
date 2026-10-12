import { describe, expect, it, vi } from 'vitest';
import { DashboardRepository } from './dashboard.repository';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';

function prismaFake() {
  return {
    cliente: { count: vi.fn().mockResolvedValue(4) },
    produto: {
      count: vi.fn().mockResolvedValue(9),
      findMany: vi.fn().mockResolvedValue([]),
    },
    projeto: {
      count: vi.fn().mockResolvedValue(2),
      findMany: vi.fn().mockResolvedValue([]),
    },
    compra: { count: vi.fn().mockResolvedValue(1) },
    despesa: {
      aggregate: vi.fn().mockResolvedValue({ _count: 3, _sum: { valor: 150 } }),
    },
    receita: {
      aggregate: vi.fn().mockResolvedValue({ _count: 2, _sum: { valor: null } }),
    },
  };
}

function montar() {
  const prisma = prismaFake();
  const service = new DashboardService(
    new DashboardRepository(prisma as unknown as PrismaService),
  );
  return { prisma, service, controller: new DashboardController(service) };
}

const usuario = (acessoFinanceiro: boolean): AuthenticatedUser => ({
  id: 1,
  nome: 'x',
  email: 'x@example.test',
  cargo: 'GERENTE',
  acessoFinanceiro,
});

describe('dashboard — totais financeiros', () => {
  it('sem acesso financeiro, nem consulta despesas e receitas', async () => {
    const { prisma, controller } = montar();

    const overview = await controller.overview(usuario(false));

    expect(prisma.despesa.aggregate).not.toHaveBeenCalled();
    expect(prisma.receita.aggregate).not.toHaveBeenCalled();
    expect(overview.contagens.despesasAPagar).toBeNull();
    expect(overview.contagens.receitasAReceber).toBeNull();
    expect(overview.alertas.map((a) => a.tipo)).toEqual(['compras']);
  });

  it('com acesso financeiro, traz totais e o alerta de despesas', async () => {
    const { controller } = montar();

    const overview = await controller.overview(usuario(true));

    expect(overview.contagens.despesasAPagar).toEqual({ quantidade: 3, total: 150 });
    expect(overview.contagens.receitasAReceber).toEqual({ quantidade: 2, total: 0 });
    expect(overview.alertas.map((a) => a.tipo)).toEqual(['compras', 'despesas']);
  });
});
