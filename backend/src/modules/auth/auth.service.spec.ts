import { describe, it, expect, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UsuariosRepository } from '../usuarios/usuarios.repository';
import { RefreshTokenRepository } from './refresh-token.repository';
import { hashPassword, verifyPassword } from '../../common/auth/password';

async function fixture(legacy = true) {
  const senha = legacy
    ? await bcrypt.hash('synthetic-password', 4)
    : await hashPassword('synthetic-password');
  const user = {
    id: 1,
    nome: 'Admin',
    email: 'admin@example.test',
    cargo: 'ADMINISTRADOR' as const,
    ativo: true,
    acessoFinanceiro: false,
    senha,
    mfaAtivo: false,
    mfaSegredo: null,
    mfaRecuperacao: null,
    mfaUltimoPasso: 0,
  };
  const tx = {
    usuario: { update: vi.fn() },
    sessao: { create: vi.fn(async ({ data }) => data) },
  };
  const usuarios = {
    findByEmailWithSenha: vi.fn().mockResolvedValue(user),
    findByIdWithSenha: vi.fn().mockResolvedValue(user),
  };
  const tokens = {
    withUserLock: vi.fn((_id, run) => run(tx)),
    create: vi.fn(),
  };
  const jwt = { signAsync: vi.fn().mockResolvedValue('signed-access') };
  const service = new AuthService(
    usuarios as unknown as UsuariosRepository,
    tokens as unknown as RefreshTokenRepository,
    jwt as unknown as JwtService,
    new ConfigService({ JWT_ACCESS_SECRET: 'synthetic-access-secret' }),
  );
  return { user, tx, usuarios, tokens, jwt, service };
}

describe('login e confirmação de senha', () => {
  it.each([true, false])(
    'preserva login e migra bcrypt=%s para Argon2id',
    async (legacy) => {
      const f = await fixture(legacy);
      const result = await f.service.login(f.user.email, 'synthetic-password');
      expect(result.accessToken).toBe('signed-access');
      expect(result.refreshToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(result.user.acessoFinanceiro).toBe(true);
      expect(result.user).not.toHaveProperty('senha');
      if (legacy) {
        const hash = f.tx.usuario.update.mock.calls[0][0].data.senha;
        expect(hash).toMatch(/^\$argon2id\$/);
        expect(await verifyPassword(hash, 'synthetic-password')).toBe(true);
      } else expect(f.tx.usuario.update).not.toHaveBeenCalled();
    },
  );
  it('nega senha errada e conta inativa sem emitir credenciais', async () => {
    const f = await fixture();
    await expect(f.service.login(f.user.email, 'errada')).rejects.toThrow(
      'Credenciais inválidas',
    );
    f.usuarios.findByEmailWithSenha.mockResolvedValue({
      ...f.user,
      ativo: false,
    });
    await expect(
      f.service.login(f.user.email, 'synthetic-password'),
    ).rejects.toThrow('Credenciais inválidas');
    expect(f.jwt.signAsync).not.toHaveBeenCalled();
  });
  it('confirma a senha do usuário e vincula o comprovante à sessão', async () => {
    const f = await fixture();
    const user = {
      ...f.user,
      sessaoId: '11111111-1111-4111-8111-111111111111',
    };
    await expect(f.service.reautenticar(user, 'errada')).rejects.toThrow(
      'Senha incorreta',
    );
    await expect(
      f.service.reautenticar(user, 'synthetic-password'),
    ).resolves.toEqual({ token: 'signed-access', expiresIn: 600 });
    expect(f.jwt.signAsync).toHaveBeenCalledWith(
      { purpose: 'reautenticacao', sub: 1, sid: user.sessaoId },
      expect.objectContaining({ expiresIn: 600 }),
    );
  });
});
