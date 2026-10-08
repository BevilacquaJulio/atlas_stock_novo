import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { jwtPolicy } from '../src/common/auth/jwt-policy';
import { testDatabase } from './mysql-fixture';

const prisma = testDatabase();
const api = request('http://127.0.0.1:13317');
const marker = randomUUID();
const email = `http-${marker}@example.test`;
const password = `synthetic-${marker}`;
const accessSecret = 'synthetic-http-access-secret-for-tests-only';
const refreshSecret = 'synthetic-http-refresh-secret-for-tests-only';
let server: ChildProcess | undefined;
let logs = '';
let userId: number | undefined;
let categoryId: number | undefined;
let productId: number | undefined;
let token = '';
let refreshToken = '';

beforeAll(async () => {
  await prisma.$connect();
  userId = (
    await prisma.usuario.create({
      data: {
        nome: 'HTTP sintético',
        email,
        senha: await bcrypt.hash(password, 10),
        cargo: 'ADMINISTRADOR',
      },
    })
  ).id;
  // Executa o mesmo build de produção, incluindo metadados de DI e todo o pipeline Nest.
  server = spawn(process.execPath, ['dist/src/main.js'], {
    cwd: process.cwd(),
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: '13317',
      JWT_ACCESS_SECRET: accessSecret,
      JWT_REFRESH_SECRET: refreshSecret,
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
      CORS_ORIGIN: 'http://localhost:5173',
      THROTTLE_TTL: '60',
      THROTTLE_LIMIT: '120',
    },
  });
  server.stdout?.on('data', (chunk: Buffer) => {
    logs += chunk.toString();
  });
  server.stderr?.on('data', (chunk: Buffer) => {
    logs += chunk.toString();
  });
  const deadline = Date.now() + 10_000;
  let ready = false;
  while (Date.now() < deadline) {
    if (server.exitCode !== null)
      throw new Error(`API de teste encerrou: ${logs.slice(-3000)}`);
    try {
      ready = (await api.get('/api/health/ready').timeout(500)).status === 200;
    } catch {
      /* Aguarda apenas o boot deste processo. */
    }
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!ready)
    throw new Error(`API de teste não ficou pronta: ${logs.slice(-3000)}`);
  const login = await api
    .post('/api/auth/login')
    .send({ email, senha: password })
    .expect(200);
  expect(login.body.user).not.toHaveProperty('senha');
  token = login.body.accessToken;
  refreshToken = login.body.refreshToken;
});

afterAll(async () => {
  if (server && server.exitCode === null) {
    const stopped = once(server, 'exit');
    server.kill();
    await Promise.race([
      stopped,
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
    if (server.exitCode === null) server.kill('SIGKILL');
  }
  if (productId) {
    await prisma.movimentacao.deleteMany({ where: { produtoId: productId } });
    await prisma.produto.delete({ where: { id: productId } });
  }
  if (categoryId) await prisma.categoria.delete({ where: { id: categoryId } });
  if (userId) await prisma.usuario.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

describe('pipeline HTTP real em MySQL isolado', () => {
  it('envia headers, request ID e CORS apenas para origem permitida', async () => {
    const allowed = await api
      .get('/api/health')
      .set('Origin', 'http://localhost:5173')
      .set('X-Request-Id', 'untrusted')
      .expect(200);
    expect(allowed.headers['access-control-allow-origin']).toBe(
      'http://localhost:5173',
    );
    expect(allowed.headers['x-content-type-options']).toBe('nosniff');
    expect(allowed.headers['x-request-id']).toMatch(/^[a-f0-9-]{36}$/);
    expect(allowed.headers['x-request-id']).not.toBe('untrusted');
    const denied = await api
      .get('/api/health')
      .set('Origin', 'https://untrusted.example')
      .expect(200);
    expect(denied.headers).not.toHaveProperty('access-control-allow-origin');
  });

  it('exige login e consulta cargo/estado atuais antes da autorização', async () => {
    await api.get('/api/usuarios').expect(401);
    await api
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await prisma.usuario.update({
      where: { id: userId },
      data: { cargo: 'OPERADOR' },
    });
    await api
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
    await api
      .get('/api/financeiro/resumo')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
    await prisma.usuario.update({
      where: { id: userId },
      data: { ativo: false },
    });
    await api
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
    await prisma.usuario.update({
      where: { id: userId },
      data: { ativo: true, cargo: 'ADMINISTRADOR' },
    });
  });

  it('recusa refresh e desbloqueio financeiro usados como Bearer access', async () => {
    const financial = await new JwtService().signAsync(
      { purpose: 'financeiro_unlock', sub: userId },
      {
        issuer: jwtPolicy.issuer,
        audience: jwtPolicy.audience,
        algorithm: 'HS256',
        secret: accessSecret,
        expiresIn: '8h',
      },
    );
    await api
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${refreshToken}`)
      .expect(401);
    await api
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${financial}`)
      .expect(401);
  });

  it('rejeita campos extras, coleções e números excessivos no pipeline de validação', async () => {
    const invalid = await api
      .post('/api/categorias')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: `HTTP ${marker}`, segredo: password })
      .expect(422);
    expect(JSON.stringify(invalid.body)).not.toContain(password);
    expect(invalid.body.error.requestId).toBe(invalid.headers['x-request-id']);
    await api
      .get('/api/produtos?page=100001')
      .set('Authorization', `Bearer ${token}`)
      .expect(422);
    await api
      .get('/api/produtos/2147483648')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
    await api
      .post('/api/compras')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fornecedorId: 1,
        itens: Array(101).fill({
          produtoId: 1,
          quantidade: 1,
          valorUnitario: 1,
        }),
      })
      .expect(422);
    await api
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Teste',
        email: `invalid-${marker}@example.test`,
        senha: 'á'.repeat(37),
      })
      .expect(422);
  });

  it('mantém o cadastro válido e a entrada inicial de estoque', async () => {
    const category = await api
      .post('/api/categorias')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: `HTTP ${marker}` })
      .expect(201);
    categoryId = category.body.id;
    const product = await api
      .post('/api/produtos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        codigo: `HTTP-${marker}`,
        nome: 'Produto sintético',
        categoriaId: categoryId,
        unidadeMedida: 'un',
        valorUnitario: 12.34,
        estoqueInicial: 1.5,
      })
      .expect(201);
    productId = product.body.id;
    expect(Number(product.body.quantidadeEstoque)).toBe(1.5);
    expect(
      await prisma.movimentacao.count({ where: { produtoId: productId } }),
    ).toBe(1);
    await api
      .patch(`/api/produtos/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Produto atualizado' })
      .expect(200);
  });

  it('limita o corpo e responde JSON malformado sem expor conteúdo', async () => {
    const oversized = await api
      .post('/api/auth/login')
      .send({ email, senha: 'x'.repeat(110_000) })
      .expect(413);
    expect(oversized.body.error.code).toBe('PAYLOAD_TOO_LARGE');
    const malformed = await api
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send(`{"senha":"${password}",`)
      .expect(400);
    expect(malformed.body.error.message).toBe('JSON inválido.');
    expect(JSON.stringify(malformed.body)).not.toContain(password);
  });

  it('não expõe Prisma, SQL ou valores recebidos em uma falha interna', async () => {
    const failed = await api
      .post('/api/produtos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        codigo: `FAIL-${marker}`,
        nome: password,
        categoriaId: 2147483647,
        unidadeMedida: 'un',
      })
      .expect(500);
    expect(failed.body.error.code).toBe('INTERNAL_ERROR');
    expect(failed.body.error.message).toBe('Erro interno do servidor.');
    expect(JSON.stringify(failed.body)).not.toMatch(
      /Prisma|SELECT|INSERT|stack/,
    );
    expect(JSON.stringify(failed.body)).not.toContain(password);
    expect(
      await prisma.produto.count({ where: { codigo: `FAIL-${marker}` } }),
    ).toBe(0);
  });

  it('oculta Swagger em produção e não registra tokens, cookies, query ou senha', async () => {
    await api.get('/api/docs').expect(404);
    await api.get('/api/docs-json').expect(404);
    await api
      .get(`/api/auth/me?secret=${password}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Financeiro-Token', 'synthetic-financial-secret')
      .set('Cookie', 'session=synthetic-cookie-secret')
      .expect(200);
    await new Promise((resolve) => setTimeout(resolve, 100));
    for (const secret of [
      password,
      token,
      refreshToken,
      'synthetic-financial-secret',
      'synthetic-cookie-secret',
    ])
      expect(logs).not.toContain(secret);
    expect(logs).toContain('request completed');
  });

  it('bloqueia tentativas de login após o limite específico de dez por minuto', async () => {
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 11; attempt++) {
      statuses.push(
        (
          await api
            .post('/api/auth/login')
            .send({ email, senha: 'wrong-synthetic-password' })
        ).status,
      );
    }
    expect(statuses.filter((status) => status === 401).length).toBeGreaterThan(
      0,
    );
    expect(statuses.at(-1)).toBe(429);
  });
});
