import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UsuariosRepository } from '../usuarios/usuarios.repository';
import { RefreshTokenRepository } from './refresh-token.repository';

describe('AuthService.login', () => {
  let usuarios: { findByEmailWithSenha: ReturnType<typeof vi.fn> };
  let refreshTokens: {
    createEmpty: ReturnType<typeof vi.fn>;
    setHash: ReturnType<typeof vi.fn>;
  };
  let jwt: { signAsync: ReturnType<typeof vi.fn> };
  let config: { get: ReturnType<typeof vi.fn> };
  let service: AuthService;

  beforeEach(() => {
    usuarios = { findByEmailWithSenha: vi.fn() };
    refreshTokens = {
      createEmpty: vi.fn().mockResolvedValue({ id: 10 }),
      setHash: vi.fn().mockResolvedValue(undefined),
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
