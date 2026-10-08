import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService, parseDurationMs } from './auth.service';
import { UsuariosRepository } from '../usuarios/usuarios.repository';
import { RefreshTokenRepository } from './refresh-token.repository';

const token = 'synthetic-refresh-token';
const hash = createHash('sha256').update(token).digest('hex');
const user = {
  id: 1,
  nome: 'User',
  email: 'user@example.test',
  cargo: 'OPERADOR',
  ativo: true,
};
const transaction = {};

function fixture() {
  const usuarios = { findById: vi.fn().mockResolvedValue(user) };
  const tokens = {
    withUserLock: vi.fn((_id, run) => run(transaction)),
    findById: vi.fn().mockResolvedValue({
      id: 10,
      usuarioId: 1,
      tokenHash: hash,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    }),
    revoke: vi.fn(),
    revokeAllForUser: vi.fn(),
    createEmpty: vi.fn().mockResolvedValue({ id: 11 }),
    setHash: vi.fn(),
  };
  const jwt = {
    verifyAsync: vi
      .fn()
      .mockResolvedValue({
        purpose: 'refresh',
        sub: 1,
        tokenId: 10,
        exp: Math.floor(Date.now() / 1000) + 60,
      }),
    signAsync: vi
      .fn()
      .mockResolvedValueOnce('new-access')
      .mockResolvedValueOnce('new-refresh'),
  };
  const config = new ConfigService({
    JWT_ACCESS_SECRET: 'access-secret',
    JWT_REFRESH_SECRET: 'refresh-secret',
  });
  const service = new AuthService(
    usuarios as unknown as UsuariosRepository,
    tokens as unknown as RefreshTokenRepository,
    jwt as unknown as JwtService,
    config,
  );
  return { usuarios, tokens, jwt, service };
}

describe('rotação e revogação de sessão', () => {
  let f: ReturnType<typeof fixture>;
  beforeEach(() => {
    f = fixture();
  });

  it('rotaciona token válido no mesmo contexto transacional e persiste somente hash', async () => {
    await expect(f.service.refresh(token)).resolves.toEqual({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });
    expect(f.tokens.withUserLock).toHaveBeenCalledWith(1, expect.any(Function));
    expect(f.tokens.revoke).toHaveBeenCalledWith(10, transaction);
    expect(f.tokens.setHash).toHaveBeenCalledWith(
      11,
      createHash('sha256').update('new-refresh').digest('hex'),
      transaction,
    );
    expect(f.jwt.signAsync.mock.calls[0][0]).toMatchObject({
      purpose: 'access',
      cargo: 'OPERADOR',
      sub: 1,
    });
    expect(f.tokens.revokeAllForUser).not.toHaveBeenCalled();
  });

  it.each([
    null,
    { id: 10, usuarioId: 2 },
    { id: 10, usuarioId: 1, tokenHash: hash, expiresAt: new Date(0) },
  ])(
    'recusa registro ausente, de outro usuário ou expirado',
    async (stored) => {
      f.tokens.findById.mockResolvedValue(stored);
      await expect(f.service.refresh(token)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(f.jwt.signAsync).not.toHaveBeenCalled();
      expect(f.tokens.revokeAllForUser).not.toHaveBeenCalled();
    },
  );

  it.each([{ revokedAt: new Date() }, { tokenHash: 'different-hash' }])(
    'revoga a família ao detectar reuso ou hash divergente',
    async (changes) => {
      f.tokens.findById.mockResolvedValue({
        id: 10,
        usuarioId: 1,
        tokenHash: hash,
        revokedAt: null,
        ...changes,
      });
      await expect(f.service.refresh(token)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(f.tokens.revokeAllForUser).toHaveBeenCalledWith(1, transaction);
      expect(f.jwt.signAsync).not.toHaveBeenCalled();
    },
  );

  it.each([null, { ...user, ativo: false }])(
    'revoga sessões de usuário removido ou inativo',
    async (current) => {
      f.usuarios.findById.mockResolvedValue(current);
      await expect(f.service.refresh(token)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(f.tokens.revokeAllForUser).toHaveBeenCalledWith(1, transaction);
      expect(f.tokens.createEmpty).not.toHaveBeenCalled();
    },
  );

  it('rejeita assinatura inválida e finalidade diferente antes de consultar a sessão', async () => {
    f.jwt.verifyAsync.mockRejectedValueOnce(new Error('invalid signature'));
    await expect(f.service.refresh(token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    f.jwt.verifyAsync.mockResolvedValueOnce({
      purpose: 'access',
      sub: 1,
      tokenId: 10,
      exp: Math.floor(Date.now() / 1000) + 60,
    });
    await expect(f.service.refresh(token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(f.tokens.withUserLock).not.toHaveBeenCalled();
  });

  it('logout com token inválido é idempotente e não acessa o banco', async () => {
    f.jwt.verifyAsync.mockRejectedValue(new Error('expired'));
    await expect(f.service.logout(token)).resolves.toBeUndefined();
    expect(f.tokens.withUserLock).not.toHaveBeenCalled();
  });

  it.each([
    null,
    { usuarioId: 2, tokenHash: hash },
    { usuarioId: 1, tokenHash: 'wrong' },
  ])(
    'logout não revoga sessão que não corresponde ao token',
    async (stored) => {
      f.tokens.findById.mockResolvedValue(stored);
      await f.service.logout(token);
      expect(f.tokens.revoke).not.toHaveBeenCalled();
      expect(f.tokens.revokeAllForUser).not.toHaveBeenCalled();
    },
  );

  it('logout revoga sessão ativa; reuso revoga os sucessores', async () => {
    await f.service.logout(token);
    expect(f.tokens.revoke).toHaveBeenCalledWith(10, transaction);
    f.tokens.findById.mockResolvedValue({
      id: 10,
      usuarioId: 1,
      tokenHash: hash,
      revokedAt: new Date(),
    });
    await f.service.logout(token);
    expect(f.tokens.revokeAllForUser).toHaveBeenCalledWith(1, transaction);
  });

  it.each([
    ['30s', 30_000],
    ['15m', 900_000],
    ['2h', 7_200_000],
    ['7d', 604_800_000],
  ])('interpreta TTL %s', (value, expected) => {
    expect(parseDurationMs(String(value))).toBe(expected);
  });
  it.each(['', '1y', '-1s', '1.5h'])('rejeita TTL malformado %s', (value) => {
    expect(() => parseDurationMs(value)).toThrow('Duração de token inválida.');
  });
});
