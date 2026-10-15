import { beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService, digest } from './auth.service';
import { UsuariosRepository } from '../usuarios/usuarios.repository';
import { RefreshTokenRepository } from './refresh-token.repository';

const token = 'a'.repeat(43);
const sid = randomUUID();
const user = {
  id: 1,
  nome: 'User',
  email: 'user@example.test',
  cargo: 'OPERADOR',
  ativo: true,
  acessoFinanceiro: false,
};
function fixture() {
  const transaction = {};
  const stored = {
    id: 10,
    usuarioId: 1,
    sessaoId: sid,
    tokenHash: digest(token),
    revokedAt: null as Date | null,
    expiresAt: new Date(Date.now() + 60_000),
    sessao: {
      id: sid,
      expiraEm: new Date(Date.now() + 60_000),
      revogadoEm: null as Date | null,
    },
  };
  const usuarios = { findById: vi.fn().mockResolvedValue(user) };
  const tokens = {
    withUserLock: vi.fn((_id, run) => run(transaction)),
    findByHash: vi.fn().mockResolvedValue(stored),
    revoke: vi.fn(),
    revokeSession: vi.fn(),
    revokeAllForUser: vi.fn(),
    create: vi.fn(),
  };
  const jwt = { signAsync: vi.fn().mockResolvedValue('new-access') };
  const service = new AuthService(
    usuarios as unknown as UsuariosRepository,
    tokens as unknown as RefreshTokenRepository,
    jwt as unknown as JwtService,
    new ConfigService({ JWT_ACCESS_SECRET: 'synthetic-access' }),
  );
  return { usuarios, tokens, jwt, service, transaction, stored };
}
describe('sessões com refresh opaco', () => {
  let f: ReturnType<typeof fixture>;
  beforeEach(() => {
    f = fixture();
  });
  it('rotaciona em transação e armazena somente resumo aleatório, mantendo família e validade absoluta', async () => {
    const result = await f.service.refresh(token);
    expect(result.accessToken).toBe('new-access');
    expect(result.refreshToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(f.tokens.revoke).toHaveBeenCalledWith(10, f.transaction);
    expect(f.tokens.create).toHaveBeenCalledWith(
      1,
      sid,
      digest(result.refreshToken),
      f.stored.sessao.expiraEm,
      f.transaction,
    );
    expect(f.jwt.signAsync).toHaveBeenCalledWith(
      { purpose: 'access', sub: 1, sid },
      expect.any(Object),
    );
  });
  it('reuso revoga só a família antes de retornar 401', async () => {
    f.tokens.findByHash.mockResolvedValue({
      ...f.stored,
      revokedAt: new Date(),
    });
    await expect(f.service.refresh(token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(f.tokens.revokeSession).toHaveBeenCalledWith(sid, f.transaction);
    expect(f.tokens.revokeAllForUser).not.toHaveBeenCalled();
  });
  it.each([
    'missing',
    'expired-token',
    'expired-session',
    'revoked-session',
    'legacy',
  ])('recusa %s sem emissão', async (condition) => {
    const row = { ...f.stored, sessao: { ...f.stored.sessao } };
    if (condition === 'expired-token') row.expiresAt = new Date(0);
    if (condition === 'expired-session') row.sessao.expiraEm = new Date(0);
    if (condition === 'revoked-session') row.sessao.revogadoEm = new Date();
    f.tokens.findByHash.mockResolvedValue(
      condition === 'missing'
        ? null
        : condition === 'legacy'
          ? { ...row, sessao: null }
          : row,
    );
    await expect(f.service.refresh(token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(f.jwt.signAsync).not.toHaveBeenCalled();
  });
  it.each([null, { ...user, ativo: false }])(
    'conta removida/inativa revoga todas as sessões',
    async (current) => {
      f.usuarios.findById.mockResolvedValue(current);
      await expect(f.service.refresh(token)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(f.tokens.revokeAllForUser).toHaveBeenCalledWith(1, f.transaction);
    },
  );
  it('logout desconhecido é idempotente', async () => {
    f.tokens.findByHash.mockResolvedValue(null);
    await f.service.logout(token);
    expect(f.tokens.withUserLock).not.toHaveBeenCalled();
  });
  it('logout revoga a sessão e seus sucessores', async () => {
    await f.service.logout(token);
    expect(f.tokens.revokeSession).toHaveBeenCalledWith(sid, f.transaction);
  });
});
