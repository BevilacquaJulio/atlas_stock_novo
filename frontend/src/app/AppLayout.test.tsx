import { lazy } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AppLayout } from './AppLayout';

vi.mock('../features/auth/useAuth', () => ({
  useAuth: () => ({
    user: {
      nome: 'Administrador',
      cargo: 'ADMINISTRADOR',
      acessoFinanceiro: true,
    },
    logout: vi.fn(),
  }),
}));
vi.mock('../components/NotificationBell', () => ({
  NotificationBell: () => null,
}));
vi.mock('../components/ReautenticacaoDialog', () => ({
  ReautenticacaoDialog: () => null,
}));

function deferredPage(title: string) {
  let resolve!: (module: { default: () => React.ReactNode }) => void;
  const promise = new Promise<{ default: () => React.ReactNode }>((done) => {
    resolve = done;
  });
  return {
    Page: lazy(() => promise),
    load: async () => {
      resolve({ default: () => <h1>{title}</h1> });
      await promise;
    },
  };
}

describe('navegação entre páginas', () => {
  it('mostra carregamento e a última rota mesmo quando uma página anterior ainda está carregando', async () => {
    const movements = deferredPage('Movimentações de estoque');
    const categories = deferredPage('Categorias');
    render(
      <MemoryRouter initialEntries={['/financeiro']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="financeiro" element={<h1>Financeiro</h1>} />
            <Route
              path="cadastros/movimentacoes"
              element={<movements.Page />}
            />
            <Route path="cadastros/categorias" element={<categories.Page />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    const main = within(screen.getByRole('main'));
    const nav = within(screen.getByRole('navigation'));
    expect(main.getByRole('heading', { name: 'Financeiro' })).toBeVisible();
    fireEvent.click(nav.getByRole('link', { name: 'Movimentações' }));
    expect(main.getByRole('status')).toHaveTextContent('Carregando');
    fireEvent.click(nav.getByRole('link', { name: 'Categorias' }));
    expect(main.getByRole('status')).toBeVisible();
    await act(categories.load);
    expect(main.getByRole('heading', { name: 'Categorias' })).toBeVisible();
    expect(
      main.queryByRole('heading', { name: 'Financeiro' }),
    ).not.toBeInTheDocument();
    await act(movements.load);
    expect(main.getByRole('heading', { name: 'Categorias' })).toBeVisible();
    expect(
      main.queryByRole('heading', { name: 'Movimentações de estoque' }),
    ).not.toBeInTheDocument();
    fireEvent.click(nav.getByRole('link', { name: 'Movimentações' }));
    await act(async () => {});
    expect(
      main.getByRole('heading', { name: 'Movimentações de estoque' }),
    ).toBeVisible();
  });
});
