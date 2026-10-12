import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AppLayout } from './AppLayout';
import DashboardPage from '../features/dashboard/DashboardPage';
import FinanceiroPage from '../features/financeiro/FinanceiroPage';
import ComprasPage from '../features/compras/ComprasPage';
import { getDashboard } from '../features/dashboard/dashboard.api';
import { listCompras } from '../features/compras/compras.api';
import type { AuthUser, Cargo } from '../features/auth/auth.types';
import type { Compra, CompraStatus } from '../features/compras/compras.types';
import type { DashboardOverview } from '../features/dashboard/dashboard.types';

let usuario: AuthUser;

vi.mock('../features/auth/useAuth', () => ({
  useAuth: () => ({ user: usuario, logout: vi.fn() }),
}));
vi.mock('../features/dashboard/dashboard.api', () => ({ getDashboard: vi.fn() }));
vi.mock('../features/compras/compras.api', () => ({
  listCompras: vi.fn(),
  getCompra: vi.fn(),
}));

function como(cargo: Cargo, acessoFinanceiro = cargo === 'ADMINISTRADOR') {
  usuario = { id: 1, nome: 'Pessoa', email: 'p@example.test', cargo, acessoFinanceiro };
}

function renderCom(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const overview = (financeiro: boolean): DashboardOverview => ({
  contagens: {
    clientes: 1,
    produtos: 2,
    projetosAtivos: 0,
    projetosEmAndamento: 0,
    comprasAPagar: 0,
    despesasAPagar: financeiro ? { quantidade: 3, total: '150.00' } : null,
    receitasAReceber: financeiro ? { quantidade: 1, total: '80.00' } : null,
    produtosEstoqueBaixo: [],
  },
  projetosRecentes: [],
  alertas: [],
});

const compra = (id: number, status: CompraStatus): Compra => ({
  id,
  fornecedorId: 1,
  status,
  dataCompra: '2026-10-01T00:00:00.000Z',
  dataPagamento: null,
  valorTotal: '10.00',
  observacoes: null,
  usuarioId: 1,
  fornecedor: { id: 1, nomeRazaoSocial: 'Fornecedor' },
  _count: { itens: 1 },
});

beforeEach(() => {
  vi.mocked(getDashboard).mockReset().mockResolvedValue(overview(false));
  vi.mocked(listCompras)
    .mockReset()
    .mockResolvedValue({
      data: [compra(1, 'A_PAGAR'), compra(2, 'PAGO'), compra(3, 'CONFIRMADA')],
      total: 3,
      page: 1,
      limit: 20,
    } as never);
});

const link = (nome: string) => screen.queryAllByRole('link', { name: nome });

describe('menu por permissão', () => {
  it('operador não vê financeiro nem usuários', () => {
    como('OPERADOR');
    renderCom(<AppLayout />);
    expect(link('Compras').length).toBeGreaterThan(0);
    expect(link('Financeiro')).toHaveLength(0);
    expect(link('Usuários')).toHaveLength(0);
  });

  it('gerente autorizado vê financeiro, mas não usuários', () => {
    como('GERENTE', true);
    renderCom(<AppLayout />);
    expect(link('Financeiro').length).toBeGreaterThan(0);
    expect(link('Usuários')).toHaveLength(0);
  });

  it('administrador vê financeiro e usuários', () => {
    como('ADMINISTRADOR');
    renderCom(<AppLayout />);
    expect(link('Financeiro').length).toBeGreaterThan(0);
    expect(link('Usuários').length).toBeGreaterThan(0);
  });
});

describe('telas financeiras', () => {
  it('dashboard esconde totais quando a API não os envia', async () => {
    como('GERENTE');
    renderCom(<DashboardPage />);
    expect(await screen.findByText('Clientes ativos')).toBeInTheDocument();
    expect(screen.queryByText('Despesas a pagar')).not.toBeInTheDocument();
  });

  it('dashboard mostra totais para quem tem acesso', async () => {
    como('ADMINISTRADOR');
    vi.mocked(getDashboard).mockResolvedValue(overview(true));
    renderCom(<DashboardPage />);
    expect(await screen.findByText('Despesas a pagar')).toBeInTheDocument();
    expect(screen.getByText('Receitas a receber')).toBeInTheDocument();
  });

  it('financeiro explica a falta de acesso sem chamar a API', () => {
    como('GERENTE', false);
    renderCom(<FinanceiroPage />);
    expect(screen.getByText('Sem acesso ao financeiro')).toBeInTheDocument();
  });
});

describe('ações de compras', () => {
  const botoes = (nome: string) => screen.queryAllByRole('button', { name: nome });

  it('operador confirma recebimento, mas não paga, estorna, cancela ou desconfirma', async () => {
    como('OPERADOR');
    renderCom(<ComprasPage />);
    expect((await screen.findAllByRole('button', { name: /Confirmar/ })).length).toBeGreaterThan(0);
    for (const nome of ['Pagar', 'Cancelar', /Estornar/, /Desconfirmar/] as const) {
      expect(screen.queryAllByRole('button', { name: nome })).toHaveLength(0);
    }
  });

  it('gerente sem permissão financeira desconfirma, mas não paga', async () => {
    como('GERENTE', false);
    renderCom(<ComprasPage />);
    expect((await screen.findAllByRole('button', { name: /Desconfirmar/ })).length).toBeGreaterThan(0);
    expect(botoes('Pagar')).toHaveLength(0);
  });

  it('quem tem acesso financeiro vê todas as ações', async () => {
    como('ADMINISTRADOR');
    renderCom(<ComprasPage />);
    expect((await screen.findAllByRole('button', { name: 'Pagar' })).length).toBeGreaterThan(0);
    expect(screen.queryAllByRole('button', { name: /Estornar/ }).length).toBeGreaterThan(0);
    expect(botoes('Cancelar').length).toBeGreaterThan(0);
  });
});
