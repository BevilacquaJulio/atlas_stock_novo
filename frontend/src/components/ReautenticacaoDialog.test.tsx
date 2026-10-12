import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { ReautenticacaoDialog } from './ReautenticacaoDialog';
import {
  reautenticacaoStore,
  solicitarReautenticacao,
} from '../lib/reautenticacao';
import { reautenticarRequest } from '../features/auth/auth.api';

vi.mock('../features/auth/auth.api', () => ({
  reautenticarRequest: vi.fn(),
}));

function senhaIncorreta() {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('Bad Request', 'ERR_BAD_REQUEST', config, undefined, {
    config,
    data: { error: { code: 'BAD_REQUEST', message: 'Senha incorreta.' } },
    status: 400,
    statusText: 'Bad Request',
    headers: new AxiosHeaders(),
  });
}

describe('ReautenticacaoDialog', () => {
  beforeEach(() => {
    vi.mocked(reautenticarRequest).mockReset();
    reautenticacaoStore.clear();
  });
  afterEach(() => reautenticacaoStore.clear());

  it('pede a senha, mostra erro de senha incorreta e libera após confirmar', async () => {
    const user = userEvent.setup();
    render(<ReautenticacaoDialog />);
    let pedido!: Promise<boolean>;
    act(() => {
      pedido = solicitarReautenticacao();
    });

    const campo = await screen.findByLabelText('Sua senha');
    vi.mocked(reautenticarRequest).mockRejectedValueOnce(senhaIncorreta());
    await user.type(campo, 'errada');
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText('Senha incorreta.')).toBeInTheDocument();
    expect(reautenticacaoStore.get()).toBeNull();

    vi.mocked(reautenticarRequest).mockResolvedValueOnce({
      token: 'token-confirmado',
      expiresIn: 600,
    });
    await user.clear(campo);
    await user.type(campo, 'certa');
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));

    await expect(pedido).resolves.toBe(true);
    expect(reautenticarRequest).toHaveBeenLastCalledWith('certa');
    expect(reautenticacaoStore.get()).toBe('token-confirmado');
  });

  it('cancelar recusa a ação sem chamar a API', async () => {
    const user = userEvent.setup();
    render(<ReautenticacaoDialog />);
    let pedido!: Promise<boolean>;
    act(() => {
      pedido = solicitarReautenticacao();
    });

    await screen.findByLabelText('Sua senha');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    await expect(pedido).resolves.toBe(false);
    expect(reautenticarRequest).not.toHaveBeenCalled();
  });
});
