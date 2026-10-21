import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage';
import { demoAccount } from './demo-account';

const login = vi.fn();
vi.mock('./useAuth', () => ({
  useAuth: () => ({ login, status: 'unauthenticated' }),
}));
beforeEach(() => {
  login.mockReset();
  vi.stubEnv('VITE_DEMO_MODE', 'true');
});
afterEach(() => vi.unstubAllEnvs());

describe('login sem MFA e conta de demonstração', () => {
  it('valida o e-mail antes de chamar a API', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'email-invalido' },
    });
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'senha-sintetica' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('E-mail inválido.')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });
  it('permite entrar com credenciais próprias', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'conta@example.test' },
    });
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'senha-sintetica' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() =>
      expect(login).toHaveBeenCalledWith(
        'conta@example.test',
        'senha-sintetica',
      ),
    );
  });
  it('exibe uma mensagem segura quando o login falha', async () => {
    login.mockRejectedValueOnce(new Error('synthetic-private-detail'));
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'conta@example.test' },
    });
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'senha-errada' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(
      await screen.findByText('Não foi possível entrar.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('synthetic-private-detail'),
    ).not.toBeInTheDocument();
  });
  it('preenche somente a conta demo e aguarda a confirmação de entrada', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Preencher conta de demonstração' }),
    );
    expect(screen.getByLabelText('E-mail')).toHaveValue(demoAccount.email);
    expect(screen.getByLabelText('Senha')).toHaveValue(demoAccount.password);
    expect(screen.queryByLabelText(/MFA/)).not.toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() =>
      expect(login).toHaveBeenCalledWith(
        demoAccount.email,
        demoAccount.password,
      ),
    );
  });
  it('não oferece credenciais demo quando a demonstração está desabilitada no build', () => {
    vi.stubEnv('VITE_DEMO_MODE', 'false');
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    expect(
      screen.queryByRole('button', { name: 'Preencher conta de demonstração' }),
    ).not.toBeInTheDocument();
  });
});
