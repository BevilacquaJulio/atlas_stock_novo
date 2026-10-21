import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../src/modules/auth/auth.service';
import { RefreshTokenRepository } from '../src/modules/auth/refresh-token.repository';
import { UsuariosRepository } from '../src/modules/usuarios/usuarios.repository';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { testDatabase } from './mysql-fixture';

const prisma = testDatabase();
const usuarios = new UsuariosRepository(prisma);
const tokens = new RefreshTokenRepository(prisma);
const jwt = new JwtService();
const config = new ConfigService({
  JWT_ACCESS_SECRET: 'synthetic-account-access-for-testing-only',
});
const service = new AuthService(usuarios, tokens, jwt, config);
const guard = new JwtAuthGuard(jwt, config, new Reflector(), usuarios);
const password = 'synthetic-account-password';
let id: number;
let email: string;

function checkAccess(token: string) {
  return guard.canActivate({
    getHandler: () => checkAccess,
    getClass: () => AuthService,
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization: `Bearer ${token}` } }),
    }),
  } as unknown as ExecutionContext);
}
beforeEach(async () => {
  email = `account-${randomUUID()}@example.test`;
  const user = await prisma.usuario.create({
    data: {
      email,
      nome: 'Conta sintética',
      cargo: 'ADMINISTRADOR',
      senha: await bcrypt.hash(password, 4),
    },
  });
  id = user.id;
});
afterEach(async () => {
  if (id) await prisma.usuario.delete({ where: { id } });
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe('ciclo completo de contas em MySQL descartável', () => {
  it('não exige MFA legado no login após a remoção da funcionalidade', async () => {
    await prisma.usuario.update({ where: { id }, data: { mfaAtivo: true } });
    const login = await service.login(email, password);
    expect(await checkAccess(login.accessToken)).toBe(true);
    expect(login.user).not.toHaveProperty('mfaAtivo');
    expect(await service.reautenticar(login.user, password)).toHaveProperty(
      'token',
    );
  });
  it('migra bcrypt após login e logout invalida imediatamente o access token', async () => {
    const login = await service.login(email, password);
    const stored = await prisma.usuario.findUniqueOrThrow({ where: { id } });
    expect(stored.senha).toMatch(/^\$argon2id\$/);
    expect(await checkAccess(login.accessToken)).toBe(true);
    await service.logout(login.refreshToken);
    await expect(checkAccess(login.accessToken)).rejects.toThrow(
      'Token de acesso inválido',
    );
  });

  it('reuso concorrente encerra uma família e preserva outro login', async () => {
    const first = await service.login(email, password);
    const second = await service.login(email, password);
    const rotated = await Promise.allSettled([
      service.refresh(first.refreshToken),
      service.refresh(first.refreshToken),
    ]);
    expect(
      rotated.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    await expect(checkAccess(first.accessToken)).rejects.toThrow();
    await expect(service.refresh(second.refreshToken)).resolves.toHaveProperty(
      'accessToken',
    );
  });

  it('troca de senha revoga sessões e links de recuperação pendentes', async () => {
    const login = await service.login(email, password);
    const recovery = await service.createRecovery(id);
    await expect(
      service.changePassword(login.user, 'errada', 'nova-senha-sintetica'),
    ).rejects.toThrow('Senha incorreta');
    await service.changePassword(login.user, password, 'nova-senha-sintetica');
    await expect(service.login(email, password)).rejects.toThrow(
      'Credenciais inválidas',
    );
    await expect(
      service.login(email, 'nova-senha-sintetica'),
    ).resolves.toHaveProperty('accessToken');
    await expect(checkAccess(login.accessToken)).rejects.toThrow();
    await expect(
      service.recoverPassword(recovery.token, password),
    ).rejects.toThrow('Link inválido');
  });

  it('recuperação é de uso único sob concorrência e não guarda token em texto', async () => {
    const login = await service.login(email, password);
    const first = await service.createRecovery(id);
    const second = await service.createRecovery(id);
    await expect(
      service.recoverPassword(first.token, password),
    ).rejects.toThrow('Link inválido');
    const rows = await prisma.recuperacaoSenha.findMany({
      where: { usuarioId: id },
    });
    expect(JSON.stringify(rows)).not.toContain(second.token);
    const attempts = await Promise.allSettled([
      service.recoverPassword(second.token, 'nova-senha-sintetica'),
      service.recoverPassword(second.token, 'outra-senha-sintetica'),
    ]);
    expect(
      attempts.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    await expect(checkAccess(login.accessToken)).rejects.toThrow();
  });

  it('recusa recuperação expirada e sessão pertencente a outra conta', async () => {
    const link = await service.createRecovery(id);
    await prisma.recuperacaoSenha.updateMany({
      where: { usuarioId: id },
      data: { expiraEm: new Date(0) },
    });
    await expect(service.recoverPassword(link.token, password)).rejects.toThrow(
      'Link inválido',
    );
    const login = await service.login(email, password);
    await expect(
      service.revokeSession(
        { ...login.user, id: id + 1000000 },
        login.user.sessaoId!,
      ),
    ).rejects.toThrow('Sessão não encontrada');
    expect(await checkAccess(login.accessToken)).toBe(true);
    const sessions = await service.listSessions(login.user);
    expect(sessions).toHaveLength(1);
    expect(Object.keys(sessions[0]).sort()).toEqual([
      'criadoEm',
      'expiraEm',
      'id',
    ]);
  });
});
