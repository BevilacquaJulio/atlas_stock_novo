import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoriaForm } from './CategoriaForm';
import type { Cargo } from '../auth/auth.types';

let cargo: Cargo = 'OPERADOR';

vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, nome: 'x', email: 'x@example.test', cargo, acessoFinanceiro: false },
  }),
}));

const categoria = {
  id: 3,
  nome: 'Vidros',
  descricao: null,
  ativo: true,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

function enviar() {
  const onSubmit = vi.fn();
  render(
    <>
      <CategoriaForm initial={categoria} onSubmit={onSubmit} />
      <button type="submit" form="categoria-form">
        Salvar
      </button>
    </>,
  );
  return onSubmit;
}

describe('CategoriaForm — campo ativo', () => {
  beforeEach(() => {
    cargo = 'OPERADOR';
  });

  it('operador edita sem ver nem enviar o campo ativo (a API recusaria)', async () => {
    const onSubmit = enviar();
    expect(screen.queryAllByLabelText('Ativo')).toHaveLength(0);

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('ativo');
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ nome: 'Vidros' });
  });

  it('gestão vê e envia o campo ativo', async () => {
    cargo = 'GERENTE';
    const onSubmit = enviar();
    expect(screen.getAllByLabelText('Ativo').length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ ativo: true });
  });
});
