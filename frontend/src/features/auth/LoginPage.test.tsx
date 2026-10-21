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
  vi.stubEnv('VITE_DEMO_PASSWORD', 'synthetic-demo-password');
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
  it('substitui credenciais inválidas e entra com a conta demo em um clique', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'email-invalido' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('E-mail inválido.')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Entrar com conta de demonstração' }),
    );
    expect(screen.getByLabelText('E-mail')).toHaveValue(demoAccount.email);
    expect(screen.getByLabelText('Senha')).toHaveValue(demoAccount.password);
    expect(screen.queryByLabelText(/MFA/)).not.toBeInTheDocument();
    await waitFor(() =>
      expect(login).toHaveBeenCalledWith(
        demoAccount.email,
        demoAccount.password,
      ),
    );
    expect(login).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.queryByText('E-mail inválido.')).not.toBeInTheDocument(),
    );
  });
  it('bloqueia novas entradas enquanto o login demo está pendente e permite tentar após falha', async () => {
    let rejectLogin!: (reason: Error) => void;
    login.mockImplementationOnce(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectLogin = reject;
        }),
    );
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    const demoButton = screen.getByRole('button', {
      name: 'Entrar com conta de demonstração',
    });
    fireEvent.click(demoButton);
    await waitFor(() => expect(login).toHaveBeenCalledTimes(1));
    expect(demoButton).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeDisabled();
    fireEvent.click(demoButton);
    expect(login).toHaveBeenCalledTimes(1);
    rejectLogin(new Error('synthetic-private-detail'));
    expect(
      await screen.findByText('Não foi possível entrar.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(demoButton).toBeEnabled());
    fireEvent.click(demoButton);
    await waitFor(() => expect(login).toHaveBeenCalledTimes(2));
    expect(
      screen.queryByText('Não foi possível entrar.'),
    ).not.toBeInTheDocument();
  });
  it('não oferece credenciais demo quando a demonstração está desabilitada no build', () => {
    vi.stubEnv('VITE_DEMO_MODE', 'false');
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    expect(
      screen.queryByRole('button', {
        name: 'Entrar com conta de demonstração',
      }),
    ).not.toBeInTheDocument();
  });
  it('não oferece conta demo sem senha configurada', () => {
    vi.stubEnv('VITE_DEMO_PASSWORD', '');
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    expect(
      screen.queryByRole('button', {
        name: 'Entrar com conta de demonstração',
      }),
    ).not.toBeInTheDocument();
  });
});
