import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import { UsuariosController } from './usuarios.controller';
import type { UsuariosService } from './usuarios.service';
import { AuthController } from '../auth/auth.controller';
import type { AuthService } from '../auth/auth.service';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';

const admin: AuthenticatedUser = {
  id: 1,
  nome: 'Admin',
  email: 'a@example.test',
  cargo: 'ADMINISTRADOR',
  acessoFinanceiro: true,
};

describe('handlers de usuários e reautenticação', () => {
  it('usuários: lista, cria e altera acesso repassando ao serviço', async () => {
    const service = {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 2 }),
      atualizarAcesso: vi.fn().mockResolvedValue({ id: 2 }),
    };
    const controller = new UsuariosController(
      service as unknown as UsuariosService,
    );
    const novo = {
      nome: 'N',
      email: 'n@example.test',
      senha: 'senha-forte-de-teste',
      cargo: 'OPERADOR' as const,
      acessoFinanceiro: false,
    };

    await controller.list();
    await controller.create(novo);
    await controller.atualizarAcesso(2, { cargo: 'GERENTE' });

    expect(service.list).toHaveBeenCalled();
    expect(service.create).toHaveBeenCalledWith(novo);
    expect(service.atualizarAcesso).toHaveBeenCalledWith(2, {
      cargo: 'GERENTE',
    });
  });

  it('reautenticar usa o usuário autenticado, nunca um id do corpo', async () => {
    const service = {
      reautenticar: vi.fn().mockResolvedValue({ token: 't', expiresIn: 600 }),
    };
    const controller = new AuthController(
      service as unknown as AuthService,
      new ConfigService(),
    );

    await expect(
      controller.reautenticar({ senha: 'minha-senha' }, admin),
    ).resolves.toEqual({ token: 't', expiresIn: 600 });
    expect(service.reautenticar).toHaveBeenCalledWith(
      admin,
      'minha-senha',
      undefined,
    );
    expect(controller.me(admin)).toBe(admin);
  });
});
