import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AxiosError, AxiosHeaders } from 'axios';
import { api } from '../../lib/api';
import SecurityPage from './SecurityPage';
import RecoveryPage from './RecoveryPage';

const logout = vi.fn();
const authUser = {
  id: 1,
  nome: 'Sintético',
  email: 'account@example.test',
  cargo: 'ADMINISTRADOR',
  acessoFinanceiro: true,
  sessaoId: 'current',
  mfaAtivo: false,
};
vi.mock('./useAuth', () => ({ useAuth: () => ({ user: authUser, logout }) }));
const original = api.defaults.adapter;
const requests: { url?: string; method?: string; data?: unknown }[] = [];
let fail = '';
beforeEach(() => {
  logout.mockReset();
  authUser.mfaAtivo = false;
  requests.length = 0;
  fail = '';
  api.defaults.adapter = async (config) => {
    requests.push({
      url: config.url,
      method: config.method,
      data:
        typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
    });
    const response = {
      config,
      status: 200,
      statusText: 'OK',
      headers: new AxiosHeaders(),
      data: {} as unknown,
    };
    if (config.url === fail)
      throw new AxiosError('Error', 'ERR_BAD_REQUEST', config, undefined, {
        ...response,
        status: 400,
        data: { error: { message: 'Operação recusada.' } },
      });
    if (config.method === 'get')
      response.data = [
        {
          id: 'current',
          criadoEm: '2026-10-01T12:00:00Z',
          expiraEm: '2026-11-01T12:00:00Z',
        },
        {
          id: 'other',
          criadoEm: '2026-10-02T12:00:00Z',
          expiraEm: '2026-11-01T12:00:00Z',
        },
      ];
    if (config.url === '/auth/mfa/configurar')
      response.data = {
        secret: 'SYNTHETIC-SETUP-KEY',
        uri: 'otpauth://synthetic',
      };
    if (config.url === '/auth/mfa/ativar')
      response.data = {
        recoveryCodes: ['synthetic-code-one', 'synthetic-code-two'],
      };
    return response;
  };
});
afterEach(() => {
  api.defaults.adapter = original;
});
function mount(element: React.ReactNode) {
  return render(
    <MemoryRouter>
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false },
            },
          })
        }
      >
        {element}
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('segurança da conta', () => {
  it('troca a senha e encerra a sessão somente após confirmação do servidor', async () => {
    mount(<SecurityPage />);
    fireEvent.change(screen.getByLabelText('Senha atual'), {
      target: { value: 'senha-atual-sintetica' },
    });
    fireEvent.change(screen.getByLabelText('Nova senha'), {
      target: { value: 'nova-senha-sintetica' },
    });
    await userEvent.click(
      screen.getByRole('button', { name: 'Alterar senha e encerrar sessões' }),
    );
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    expect(
      requests.find((request) => request.url === '/auth/senha')?.data,
    ).toEqual({
      senhaAtual: 'senha-atual-sintetica',
      novaSenha: 'nova-senha-sintetica',
    });
  });
  it('preserva o formulário e mostra erro quando a troca é recusada', async () => {
    fail = '/auth/senha';
    mount(<SecurityPage />);
    fireEvent.change(screen.getByLabelText('Senha atual'), {
      target: { value: 'senha-atual-sintetica' },
    });
    fireEvent.change(screen.getByLabelText('Nova senha'), {
      target: { value: 'nova-senha-sintetica' },
    });
    await userEvent.click(
      screen.getByRole('button', { name: 'Alterar senha e encerrar sessões' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Operação recusada',
    );
    expect(screen.getByLabelText('Nova senha')).toHaveValue(
      'nova-senha-sintetica',
    );
    expect(logout).not.toHaveBeenCalled();
  });
  it('ativa MFA, mostra códigos uma vez e só sai quando a pessoa os guardou', async () => {
    mount(<SecurityPage />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Configurar MFA' }),
    );
    expect(await screen.findByText('SYNTHETIC-SETUP-KEY')).toBeInTheDocument();
    fireEvent.change(
      screen.getByLabelText('Código do autenticador ou de recuperação'),
      { target: { value: '123456' } },
    );
    await userEvent.click(screen.getByRole('button', { name: 'Ativar MFA' }));
    expect(await screen.findByText(/synthetic-code-one/)).toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole('button', {
        name: 'Guardei os códigos; entrar novamente',
      }),
    );
    expect(logout).toHaveBeenCalledTimes(1);
  });
  it('desativa MFA com o código informado e encerra a sessão', async () => {
    authUser.mfaAtivo = true;
    mount(<SecurityPage />);
    fireEvent.change(
      screen.getByLabelText('Código do autenticador ou de recuperação'),
      { target: { value: '123456' } },
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Desativar MFA e encerrar sessões' }),
    );
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    expect(
      requests.find((request) => request.url === '/auth/mfa/desativar')?.data,
    ).toEqual({ codigo: '123456' });
  });
  it('permite encerrar outra sessão e a própria sessão', async () => {
    mount(<SecurityPage />);
    await screen.findByText(/sessão atual/);
    const buttons = screen.getAllByRole('button', { name: 'Encerrar sessão' });
    await userEvent.click(buttons[1]);
    await waitFor(() =>
      expect(
        requests.some(
          (request) =>
            request.url === '/auth/sessoes/other' &&
            request.method === 'delete',
        ),
      ).toBe(true),
    );
    expect(logout).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getAllByRole('button', { name: 'Encerrar sessão' })[0],
    );
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
  });
});

describe('recuperação de senha', () => {
  it('retira o token da URL e usa o fragmento somente na confirmação', async () => {
    history.replaceState(null, '', '/recuperar#synthetic-one-use-token');
    mount(<RecoveryPage />);
    expect(location.hash).toBe('');
    fireEvent.change(screen.getByLabelText('Nova senha', { exact: true }), {
      target: { value: 'nova-senha-sintetica' },
    });
    fireEvent.change(screen.getByLabelText('Confirme a nova senha'), {
      target: { value: 'nova-senha-sintetica' },
    });
    await userEvent.click(
      screen.getByRole('button', { name: 'Atualizar senha' }),
    );
    expect(
      await screen.findByText(
        'Senha atualizada. As sessões anteriores foram encerradas.',
      ),
    ).toBeInTheDocument();
    expect(
      requests.find((request) => request.url === '/auth/recuperar')?.data,
    ).toEqual({
      token: 'synthetic-one-use-token',
      novaSenha: 'nova-senha-sintetica',
    });
    expect(screen.getByRole('link', { name: 'Entrar' })).toBeInTheDocument();
  });
  it('valida confirmação da senha e exibe recusa sem descartar o formulário', async () => {
    fail = '/auth/recuperar';
    history.replaceState(null, '', '/recuperar#synthetic-token');
    mount(<RecoveryPage />);
    fireEvent.change(screen.getByLabelText('Nova senha', { exact: true }), {
      target: { value: 'nova-senha-sintetica' },
    });
    fireEvent.change(screen.getByLabelText('Confirme a nova senha'), {
      target: { value: 'outra-senha-sintetica' },
    });
    await userEvent.click(
      screen.getByRole('button', { name: 'Atualizar senha' }),
    );
    expect(
      await screen.findByText('As senhas devem ser iguais.'),
    ).toBeInTheDocument();
    expect(requests).toHaveLength(0);
    fireEvent.change(screen.getByLabelText('Confirme a nova senha'), {
      target: { value: 'nova-senha-sintetica' },
    });
    fireEvent.change(
      screen.getByLabelText('Código MFA ou de recuperação (se ativado)'),
      { target: { value: '123456' } },
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Atualizar senha' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Operação recusada.',
    );
    expect(
      within(screen.getByRole('main')).getByLabelText('Nova senha', {
        exact: true,
      }),
    ).toHaveValue('nova-senha-sintetica');
  });
});
