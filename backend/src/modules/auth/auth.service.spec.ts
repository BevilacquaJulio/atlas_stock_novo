import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UsuariosRepository } from '../usuarios/usuarios.repository';
import { RefreshTokenRepository } from './refresh-token.repository';

describe('AuthService.login', () => {
  let usuarios: { findByEmailWithSenha: ReturnType<typeof vi.fn>; findById: ReturnType<typeof vi.fn> };
  let refreshTokens: {
    createEmpty: ReturnType<typeof vi.fn>;
    setHash: ReturnType<typeof vi.fn>;
    withUserLock: ReturnType<typeof vi.fn>;
  };
  let jwt: { signAsync: ReturnType<typeof vi.fn> };
  let config: { get: ReturnType<typeof vi.fn> };
  let service: AuthService;

  beforeEach(() => {
    usuarios = { findByEmailWithSenha: vi.fn(), findById: vi.fn().mockResolvedValue({ id: 1, nome: 'Admin', email: 'a@b.com', cargo: 'ADMINISTRADOR', ativo: true }) };
    refreshTokens = {
      createEmpty: vi.fn().mockResolvedValue({ id: 10 }),
      setHash: vi.fn().mockResolvedValue(undefined),
      withUserLock: vi.fn((_id, run) => run({})),
    };
    jwt = { signAsync: vi.fn().mockResolvedValue('signed.jwt.token') };
    config = { get: vi.fn().mockReturnValue('7d') };
    service = new AuthService(
      usuarios as unknown as UsuariosRepository,
      refreshTokens as unknown as RefreshTokenRepository,
      jwt as never,
      config as never,
    );
  });

  it('emite tokens com credenciais válidas', async () => {
    const senhaHash = await bcrypt.hash('secret123', 10);
    usuarios.findByEmailWithSenha.mockResolvedValue({
      id: 1,
      nome: 'Admin',
      email: 'a@b.com',
      senha: senhaHash,
      cargo: 'ADMINISTRADOR',
      ativo: true,
    });

    const result = await service.login('a@b.com', 'secret123');

    expect(result.accessToken).toBe('signed.jwt.token');
    expect(result.refreshToken).toBe('signed.jwt.token');
    expect(result.user).toMatchObject({ id: 1, cargo: 'ADMINISTRADOR' });
    // Permissão efetiva: administrador sempre tem acesso financeiro.
    expect(result.user.acessoFinanceiro).toBe(true);
  });

  it('rejeita senha incorreta com 401', async () => {
    const senhaHash = await bcrypt.hash('secret123', 10);
    usuarios.findByEmailWithSenha.mockResolvedValue({
      id: 1,
      nome: 'Admin',
      email: 'a@b.com',
      senha: senhaHash,
      cargo: 'OPERADOR',
      ativo: true,
    });
    await expect(service.login('a@b.com', 'errada')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejeita usuário inativo com 401', async () => {
    usuarios.findByEmailWithSenha.mockResolvedValue({
      id: 1,
      senha: 'x',
      ativo: false,
    });
    await expect(service.login('a@b.com', 'x')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

describe('AuthService.reautenticar', () => {
  const user = {
    id: 3,
    nome: 'Gerente',
    email: 'g@b.com',
    cargo: 'GERENTE' as const,
    acessoFinanceiro: true,
  };
  let usuarios: { findByIdWithSenha: ReturnType<typeof vi.fn> };
  let jwt: { signAsync: ReturnType<typeof vi.fn> };
  let service: AuthService;

  beforeEach(async () => {
    usuarios = {
      findByIdWithSenha: vi.fn().mockResolvedValue({
        id: 3,
        ativo: true,
        senha: await bcrypt.hash('senha-do-gerente', 4),
      }),
    };
    jwt = { signAsync: vi.fn().mockResolvedValue('token.reautenticacao') };
    service = new AuthService(
      usuarios as unknown as UsuariosRepository,
      {} as RefreshTokenRepository,
      jwt as never,
      { get: vi.fn().mockReturnValue('segredo') } as never,
    );
  });

  it('emite token curto de reautenticação para a própria senha', async () => {
    const result = await service.reautenticar(user, 'senha-do-gerente');

    expect(result).toEqual({ token: 'token.reautenticacao', expiresIn: 600 });
    expect(jwt.signAsync).toHaveBeenCalledWith(
      { purpose: 'reautenticacao', sub: 3 },
      expect.objectContaining({ expiresIn: 600, algorithm: 'HS256' }),
    );
  });

  it('senha errada ou usuário inativo respondem 400 sem emitir token', async () => {
    await expect(service.reautenticar(user, 'errada')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    usuarios.findByIdWithSenha.mockResolvedValue({
      id: 3,
      ativo: false,
      senha: await bcrypt.hash('senha-do-gerente', 4),
    });
    await expect(
      service.reautenticar(user, 'senha-do-gerente'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });
});
