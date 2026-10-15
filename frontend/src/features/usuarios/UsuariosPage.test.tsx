import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, AxiosHeaders } from 'axios';
import UsuariosPage from './UsuariosPage';
import {
  createUsuario,
  listUsuarios,
  updateAcessoUsuario,
} from './usuarios.api';
import type { Cargo } from '../auth/auth.types';
import type { Usuario } from './usuarios.types';
import { api } from '../../lib/api';

let cargo: Cargo = 'ADMINISTRADOR';

vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      nome: 'Admin',
      email: 'a@example.test',
      cargo,
      acessoFinanceiro: true,
    },
  }),
}));

vi.mock('./usuarios.api', () => ({
  listUsuarios: vi.fn(),
  createUsuario: vi.fn(),
  updateAcessoUsuario: vi.fn(),
}));

const linha = (over: Partial<Usuario>): Usuario => ({
  id: 1,
  nome: 'Admin',
  email: 'a@example.test',
  cargo: 'ADMINISTRADOR',
  ativo: true,
  acessoFinanceiro: false,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...over,
});

const usuarios = [
  linha({}),
  linha({
    id: 2,
    nome: 'Bia',
    email: 'gf@example.test',
    cargo: 'GERENTE',
    acessoFinanceiro: true,
  }),
  linha({ id: 3, nome: 'Caio', email: 'g@example.test', cargo: 'GERENTE' }),
  linha({
    id: 4,
    nome: 'Duda',
    email: 'o@example.test',
    cargo: 'OPERADOR',
    ativo: false,
  }),
];

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <UsuariosPage />
    </QueryClientProvider>,
  );
}

async function escolherCargo(dialog: HTMLElement, nome: string) {
  await userEvent.click(
    within(dialog).getByRole('combobox', { name: 'Cargo' }),
  );
  await userEvent.click(await screen.findByRole('option', { name: nome }));
}

function erroDaApi(message: string) {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('Conflict', 'ERR_BAD_REQUEST', config, undefined, {
    config,
    data: { error: { code: 'CONFLICT', message } },
    status: 409,
    statusText: 'Conflict',
    headers: new AxiosHeaders(),
  });
}

describe('UsuariosPage', () => {
  beforeEach(() => {
    cargo = 'ADMINISTRADOR';
    vi.mocked(listUsuarios).mockReset().mockResolvedValue(usuarios);
    vi.mocked(createUsuario).mockReset().mockResolvedValue(usuarios[0]);
    vi.mocked(updateAcessoUsuario).mockReset().mockResolvedValue(usuarios[0]);
  });

  it('quem não é administrador não vê a gestão nem consulta a API', () => {
    cargo = 'GERENTE';
    renderPage();
    expect(screen.getByText('Sem acesso')).toBeInTheDocument();
    expect(listUsuarios).not.toHaveBeenCalled();
  });

  it('lista cargos e quem acessa o financeiro', async () => {
    renderPage();
    const tabela = await screen.findByRole('table');
    const linhaDe = (nome: string) =>
      within(tabela).getByText(nome).closest('tr') as HTMLElement;

    expect(within(linhaDe('Admin')).getByText('Sempre')).toBeInTheDocument();
    expect(within(linhaDe('Bia')).getByText('Liberado')).toBeInTheDocument();
    expect(within(linhaDe('Caio')).getByText('Sem acesso')).toBeInTheDocument();
    expect(within(linhaDe('Duda')).getByText('Operador')).toBeInTheDocument();
  });

  it('gera link de uso único para o titular e permite ocultá-lo', async () => {
    const original = api.defaults.adapter;
    api.defaults.adapter = async (config) => ({
      config,
      data: { token: 'synthetic-recovery-token', expiresIn: 900 },
      status: 201,
      statusText: 'Created',
      headers: new AxiosHeaders(),
    });
    try {
      renderPage();
      const row = (await screen.findByText('Bia')).closest('tr')!;
      await userEvent.click(
        within(row).getByRole('button', { name: 'Gerar recuperação' }),
      );
      expect(
        await screen.findByRole('textbox', { name: 'Link de recuperação' }),
      ).toHaveValue(
        `${window.location.origin}/recuperar#synthetic-recovery-token`,
      );
      await userEvent.click(
        screen.getByRole('button', { name: 'Ocultar link' }),
      );
      expect(
        screen.queryByRole('textbox', { name: 'Link de recuperação' }),
      ).not.toBeInTheDocument();
    } finally {
      api.defaults.adapter = original;
    }
  });

  it('cria gerente com acesso financeiro', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(
      await screen.findByRole('button', { name: /Novo usuário/ }),
    );
    const dialog = await screen.findByRole('dialog');

    await user.type(within(dialog).getByLabelText('Nome'), 'Nova Gerente');
    await user.type(
      within(dialog).getByLabelText('E-mail'),
      'nova@example.test',
    );
    await user.type(
      within(dialog).getByLabelText('Senha inicial'),
      'senha-forte-de-teste',
    );
    // Operador não tem a opção de financeiro.
    expect(
      within(dialog).queryAllByLabelText('Acesso ao financeiro'),
    ).toHaveLength(0);
    await escolherCargo(dialog, 'Gerente');
    await user.click(
      within(dialog).getAllByLabelText('Acesso ao financeiro')[0],
    );
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(createUsuario).toHaveBeenCalledWith({
        nome: 'Nova Gerente',
        email: 'nova@example.test',
        senha: 'senha-forte-de-teste',
        cargo: 'GERENTE',
        acessoFinanceiro: true,
      }),
    );
  });

  it('valida a senha inicial antes de enviar', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(
      await screen.findByRole('button', { name: /Novo usuário/ }),
    );
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Nome'), 'Pessoa');
    await user.type(within(dialog).getByLabelText('E-mail'), 'p@example.test');
    await user.type(within(dialog).getByLabelText('Senha inicial'), 'curta');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(
      await within(dialog).findByText('Mínimo de 12 caracteres.'),
    ).toBeInTheDocument();
    expect(createUsuario).not.toHaveBeenCalled();
  });

  it('rebaixar gerente para operador retira o acesso financeiro', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(
      await screen.findByRole('button', { name: 'Editar acesso de Bia' }),
    );
    const dialog = await screen.findByRole('dialog');

    await escolherCargo(dialog, 'Operador');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(updateAcessoUsuario).toHaveBeenCalledWith(2, {
        cargo: 'OPERADOR',
        ativo: true,
        acessoFinanceiro: false,
      }),
    );
  });

  it('mostra a recusa da API (ex.: último administrador) sem fechar o formulário', async () => {
    const user = userEvent.setup();
    vi.mocked(updateAcessoUsuario).mockRejectedValue(
      erroDaApi('Não é possível remover o último administrador ativo.'),
    );
    renderPage();
    await user.click(
      await screen.findByRole('button', { name: 'Editar acesso de Admin' }),
    );
    const dialog = await screen.findByRole('dialog');

    await user.click(within(dialog).getAllByLabelText('Ativo')[0]);
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(
      await within(dialog).findByText(
        'Não é possível remover o último administrador ativo.',
      ),
    ).toBeInTheDocument();
    expect(updateAcessoUsuario).toHaveBeenCalledWith(1, {
      cargo: 'ADMINISTRADOR',
      ativo: false,
      acessoFinanceiro: false,
    });
  });
});
