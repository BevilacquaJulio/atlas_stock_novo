import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../src/modules/auth/auth.service';
import { RefreshTokenRepository } from '../src/modules/auth/refresh-token.repository';
import { UsuariosRepository } from '../src/modules/usuarios/usuarios.repository';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { jwtPolicy } from '../src/common/auth/jwt-policy';
import { testDatabase } from './mysql-fixture';

const prisma = testDatabase();
const jwt = new JwtService();
const config = new ConfigService({
  JWT_ACCESS_SECRET: 'synthetic-access-secret-for-testing-only',
  JWT_REFRESH_SECRET: 'synthetic-refresh-secret-for-testing-only',
  JWT_ACCESS_EXPIRES_IN: '15m', JWT_REFRESH_EXPIRES_IN: '7d',
});
const usuarios = new UsuariosRepository(prisma);
const tokens = new RefreshTokenRepository(prisma);
const auth = new AuthService(usuarios, tokens, jwt, config);
const guard = new JwtAuthGuard(jwt, config, new Reflector(), usuarios);
const email = `auth-${Date.now()}@example.test`;
let userId: number;

function context(token: string) {
  const request = { headers: { authorization: `Bearer ${token}` }, user: undefined };
  return { request, ctx: {
    getHandler: () => context, getClass: () => AuthService,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext };
}

beforeAll(async () => {
  await prisma.$connect();
  const user = await prisma.usuario.create({ data: {
    nome: 'Sintético', email, senha: await bcrypt.hash('synthetic-password', 10), cargo: 'ADMINISTRADOR',
  } });
  userId = user.id;
});
afterAll(async () => {
  if (userId) await prisma.usuario.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

describe('autenticação em MySQL isolado', () => {
  it('usa cargo atual, rejeita usuário inativo e tokens de outra finalidade', async () => {
    const pair = await auth.login(email, 'synthetic-password');
    await prisma.usuario.update({ where: { id: userId }, data: { cargo: 'OPERADOR' } });
    const { ctx, request } = context(pair.accessToken);
    await guard.canActivate(ctx);
    expect(request.user).toMatchObject({ cargo: 'OPERADOR' });
    const financial = await jwt.signAsync({ sub: userId, purpose: 'financeiro_unlock' }, {
      issuer: jwtPolicy.issuer, audience: jwtPolicy.audience, algorithm: 'HS256',
      secret: config.get<string>('JWT_ACCESS_SECRET'), expiresIn: '8h',
    });
    await expect(guard.canActivate(context(financial).ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(guard.canActivate(context(pair.refreshToken).ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    await prisma.usuario.update({ where: { id: userId }, data: { ativo: false } });
    await expect(guard.canActivate(context(pair.accessToken).ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    await prisma.usuario.update({ where: { id: userId }, data: { ativo: true } });
  });

  it('consome refresh uma única vez e revoga sucessores no reuso', async () => {
    const pair = await auth.login(email, 'synthetic-password');
    const result = await Promise.allSettled([auth.refresh(pair.refreshToken), auth.refresh(pair.refreshToken)]);
    expect(result.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(result.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect(await prisma.refreshToken.count({ where: { usuarioId: userId, revokedAt: null } })).toBe(0);
    const rows = await prisma.refreshToken.findMany({ where: { usuarioId: userId } });
    expect(rows.every((row) => /^[a-f0-9]{64}$/.test(row.tokenHash))).toBe(true);
  });

  it('falha de emissão mantém refresh antigo ativo por rollback', async () => {
    const pair = await auth.login(email, 'synthetic-password');
    const brokenJwt = { verifyAsync: jwt.verifyAsync.bind(jwt), signAsync: async () => { throw new Error('synthetic-sign-failure'); } };
    const broken = new AuthService(usuarios, tokens, brokenJwt as unknown as JwtService, config);
    const payload = jwt.decode<{ tokenId: number }>(pair.refreshToken);
    await expect(broken.refresh(pair.refreshToken)).rejects.toThrow('synthetic-sign-failure');
    expect((await prisma.refreshToken.findUniqueOrThrow({ where: { id: payload.tokenId } })).revokedAt).toBeNull();
    await expect(auth.refresh(pair.refreshToken)).resolves.toHaveProperty('accessToken');
  });

  it('logout e rotação concorrentes não deixam sessão ativa', async () => {
    const pair = await auth.login(email, 'synthetic-password');
    await Promise.allSettled([auth.refresh(pair.refreshToken), auth.logout(pair.refreshToken)]);
    expect(await prisma.refreshToken.count({ where: { usuarioId: userId, revokedAt: null } })).toBe(0);
  });
});
