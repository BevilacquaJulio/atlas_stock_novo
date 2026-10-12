import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../lib/api';
import { createUsuario, listUsuarios, updateAcessoUsuario } from './usuarios.api';
import { reautenticarRequest } from '../auth/auth.api';

vi.mock('../../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

describe('chamadas de usuários e reautenticação', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    vi.mocked(api.post).mockResolvedValue({ data: { id: 9 } });
    vi.mocked(api.patch).mockResolvedValue({ data: { id: 9 } });
  });

  it('usa as rotas de usuários da API', async () => {
    const novo = {
      nome: 'N',
      email: 'n@example.test',
      senha: 'senha-forte-de-teste',
      cargo: 'GERENTE' as const,
      acessoFinanceiro: true,
    };
    const acesso = { cargo: 'OPERADOR' as const, ativo: true, acessoFinanceiro: false };

    await expect(listUsuarios()).resolves.toEqual([]);
    await expect(createUsuario(novo)).resolves.toEqual({ id: 9 });
    await expect(updateAcessoUsuario(9, acesso)).resolves.toEqual({ id: 9 });

    expect(api.get).toHaveBeenCalledWith('/usuarios');
    expect(api.post).toHaveBeenCalledWith('/usuarios', novo);
    expect(api.patch).toHaveBeenCalledWith('/usuarios/9/acesso', acesso);
  });

  it('confirma a senha na rota de reautenticação', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { token: 't', expiresIn: 600 } });

    await expect(reautenticarRequest('minha-senha')).resolves.toEqual({
      token: 't',
      expiresIn: 600,
    });
    expect(api.post).toHaveBeenCalledWith('/auth/reautenticar', { senha: 'minha-senha' });
  });
});
