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
const post = api.post.bind(api);
api.post = (path: string) =>
  post(path)
    .set('Origin', 'http://localhost:5173')
    .set('X-Atlas-Client', 'web');
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
let supplierId: number | undefined;
const purchaseIds: number[] = [];
const extraUserIds: number[] = [];

/** Access token assinado como a API faz; evita logins que contam no limite. */
async function accessFor(id: number, cargo: string) {
  const session = await prisma.sessao.create({
    data: {
      id: randomUUID(),
      usuarioId: id,
      expiraEm: new Date(Date.now() + 3600000),
    },
  });
  return new JwtService().signAsync(
    {
      purpose: 'access',
      sid: session.id,
      sub: id,
      email: `x-${id}@example.test`,
      cargo,
      nome: 'x',
    },
    {
      issuer: jwtPolicy.issuer,
      audience: jwtPolicy.audience,
      algorithm: 'HS256',
      secret: accessSecret,
      expiresIn: '15m',
    },
  );
}

async function syntheticUser(
  cargo: 'GERENTE' | 'OPERADOR',
  acessoFinanceiro = false,
) {
  const user = await prisma.usuario.create({
    data: {
      nome: `HTTP ${cargo}`,
      email: `http-${cargo.toLowerCase()}-${acessoFinanceiro}-${randomUUID()}@example.test`,
      senha: await bcrypt.hash(password, 10),
      cargo,
      acessoFinanceiro,
    },
  });
  extraUserIds.push(user.id);
  return { id: user.id, bearer: `Bearer ${await accessFor(user.id, cargo)}` };
}

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
  refreshToken = String(login.headers['set-cookie'][0])
    .split(';')[0]
    .split('=')[1];
  expect(login.body).not.toHaveProperty('refreshToken');
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
  if (purchaseIds.length) {
    await prisma.compra.deleteMany({ where: { id: { in: purchaseIds } } });
  }
  if (supplierId) await prisma.fornecedor.delete({ where: { id: supplierId } });
  if (extraUserIds.length) {
    await prisma.usuario.deleteMany({ where: { id: { in: extraUserIds } } });
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
    // Criar usuário exige a confirmação de senha (guard antes da validação):
    // sem ela a resposta é 403; com ela, a senha acima de 72 bytes é recusada.
    const confirmacao = await api
      .post('/api/auth/reautenticar')
      .set('Authorization', `Bearer ${token}`)
      .send({ senha: password })
      .expect(200);
    await api
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Reautenticacao', confirmacao.body.token)
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
      .set('X-Reautenticacao', 'synthetic-reauth-secret')
      .set('Cookie', 'session=synthetic-cookie-secret')
      .expect(200);
    await new Promise((resolve) => setTimeout(resolve, 100));
    for (const secret of [
      password,
      token,
      refreshToken,
      'synthetic-financial-secret',
      'synthetic-reauth-secret',
      'synthetic-cookie-secret',
    ])
      expect(logs).not.toContain(secret);
    expect(logs).toContain('request completed');
  });

  it('aplica a matriz de acesso financeiro antes de qualquer efeito no banco', async () => {
    const admin = `Bearer ${token}`;
    const operador = await syntheticUser('OPERADOR');
    const gerente = await syntheticUser('GERENTE');
    const gerenteFinanceiro = await syntheticUser('GERENTE', true);
    supplierId = (
      await prisma.fornecedor.create({
        data: {
          nomeRazaoSocial: 'Fornecedor HTTP',
          cpfCnpj: `h${marker.slice(0, 18)}`,
        },
      })
    ).id;
    const compra = await api
      .post('/api/compras')
      .set('Authorization', operador.bearer)
      .send({
        fornecedorId: supplierId,
        itens: [{ produtoId: productId, quantidade: 1, valorUnitario: 10 }],
      })
      .expect(201);
    purchaseIds.push(compra.body.id);
    const status = async () =>
      (await prisma.compra.findUniqueOrThrow({ where: { id: compra.body.id } }))
        .status;

    // Senha financeira compartilhada não existe mais.
    await api
      .post('/api/financeiro/desbloquear')
      .set('Authorization', admin)
      .send({ senha: 'qualquer' })
      .expect(404);

    // Visualizar: admin e gerente autorizado; gerente comum e operador não.
    for (const bearer of [operador.bearer, gerente.bearer]) {
      const negado = await api
        .get('/api/financeiro/resumo')
        .set('Authorization', bearer)
        .expect(403);
      expect(negado.body.error.code).toBe('ACESSO_FINANCEIRO_NEGADO');
      const dashboard = await api
        .get('/api/dashboard')
        .set('Authorization', bearer)
        .expect(200);
      expect(dashboard.body.contagens.despesasAPagar).toBeNull();
      expect(dashboard.body.contagens.receitasAReceber).toBeNull();
    }
    for (const bearer of [admin, gerenteFinanceiro.bearer]) {
      await api
        .get('/api/financeiro/resumo')
        .set('Authorization', bearer)
        .expect(200);
      const dashboard = await api
        .get('/api/dashboard')
        .set('Authorization', bearer)
        .expect(200);
      expect(dashboard.body.contagens.despesasAPagar).not.toBeNull();
    }

    // Caminho alternativo por compras: sem permissão, nada muda.
    for (const bearer of [operador.bearer, gerente.bearer]) {
      await api
        .patch(`/api/compras/${compra.body.id}/pagar`)
        .set('Authorization', bearer)
        .send({})
        .expect(403);
      await api
        .patch(`/api/compras/${compra.body.id}/cancelar`)
        .set('Authorization', bearer)
        .expect(403);
    }
    expect(await status()).toBe('A_PAGAR');

    // Com permissão, ainda falta confirmar a própria senha.
    const semSenha = await api
      .patch(`/api/compras/${compra.body.id}/pagar`)
      .set('Authorization', gerenteFinanceiro.bearer)
      .send({})
      .expect(403);
    expect(semSenha.body.error.code).toBe('REAUTENTICACAO_NECESSARIA');
    await api
      .post('/api/auth/reautenticar')
      .set('Authorization', gerenteFinanceiro.bearer)
      .send({ senha: 'senha-errada' })
      .expect(400);
    // Confirmação feita por outro usuário não serve.
    const deOutro = await api
      .post('/api/auth/reautenticar')
      .set('Authorization', gerente.bearer)
      .send({ senha: password })
      .expect(200);
    await api
      .patch(`/api/compras/${compra.body.id}/pagar`)
      .set('Authorization', gerenteFinanceiro.bearer)
      .set('X-Reautenticacao', deOutro.body.token)
      .send({})
      .expect(403);
    expect(await status()).toBe('A_PAGAR');

    const confirmacao = await api
      .post('/api/auth/reautenticar')
      .set('Authorization', gerenteFinanceiro.bearer)
      .send({ senha: password })
      .expect(200);
    // O token de confirmação não vale como access token.
    await api
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${confirmacao.body.token}`)
      .expect(401);
    await api
      .patch(`/api/compras/${compra.body.id}/pagar`)
      .set('Authorization', gerenteFinanceiro.bearer)
      .set('X-Reautenticacao', confirmacao.body.token)
      .send({})
      .expect(200);
    expect(await status()).toBe('PAGO');

    // Estornar o recebimento é da gestão.
    await api
      .patch(`/api/compras/${compra.body.id}/desconfirmar`)
      .set('Authorization', operador.bearer)
      .expect(403);
  });

  it('impede operador de inativar pela edição e restringe a gestão de usuários', async () => {
    const operador = await syntheticUser('OPERADOR');
    await api
      .patch(`/api/categorias/${categoryId}`)
      .set('Authorization', operador.bearer)
      .send({ ativo: false })
      .expect(403);
    expect(
      (await prisma.categoria.findUniqueOrThrow({ where: { id: categoryId } }))
        .ativo,
    ).toBe(true);
    // A mesma edição sem o campo ativo continua liberada ao operador.
    await api
      .patch(`/api/categorias/${categoryId}`)
      .set('Authorization', operador.bearer)
      .send({ nome: `HTTP ${marker} editada` })
      .expect(200);

    await api
      .patch(`/api/usuarios/${operador.id}/acesso`)
      .set('Authorization', operador.bearer)
      .send({ cargo: 'ADMINISTRADOR' })
      .expect(403);
    const admin = `Bearer ${token}`;
    const semSenha = await api
      .patch(`/api/usuarios/${operador.id}/acesso`)
      .set('Authorization', admin)
      .send({ cargo: 'GERENTE', acessoFinanceiro: true })
      .expect(403);
    expect(semSenha.body.error.code).toBe('REAUTENTICACAO_NECESSARIA');
    expect(
      (await prisma.usuario.findUniqueOrThrow({ where: { id: operador.id } }))
        .cargo,
    ).toBe('OPERADOR');

    const confirmacao = await api
      .post('/api/auth/reautenticar')
      .set('Authorization', admin)
      .send({ senha: password })
      .expect(200);
    await api
      .patch(`/api/usuarios/${operador.id}/acesso`)
      .set('Authorization', admin)
      .set('X-Reautenticacao', confirmacao.body.token)
      .send({ cargo: 'OPERADOR', acessoFinanceiro: true })
      .expect(400);
    const promovido = await api
      .patch(`/api/usuarios/${operador.id}/acesso`)
      .set('Authorization', admin)
      .set('X-Reautenticacao', confirmacao.body.token)
      .send({ cargo: 'GERENTE', acessoFinanceiro: true })
      .expect(200);
    expect(promovido.body).toMatchObject({
      cargo: 'GERENTE',
      acessoFinanceiro: true,
    });
    expect(promovido.body).not.toHaveProperty('senha');
  });

  it('cookie refresh é HttpOnly/Secure e endpoints de cookie exigem origem e cabeçalho', async () => {
    await api
      .post('/api/auth/refresh')
      .set('Origin', 'https://evil.example')
      .set('Cookie', `atlas_refresh=${refreshToken}`)
      .expect(403);
    await api
      .post('/api/auth/refresh')
      .unset('X-Atlas-Client')
      .set('Cookie', `atlas_refresh=${refreshToken}`)
      .expect(403);
    const rotated = await api
      .post('/api/auth/refresh')
      .set('Cookie', `atlas_refresh=${refreshToken}`)
      .expect(200);
    expect(rotated.body).not.toHaveProperty('refreshToken');
    const cookie = String(rotated.headers['set-cookie'][0]);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Path=/api/auth');
    expect(rotated.headers['cache-control']).toBe('no-store');
    refreshToken = cookie.split(';')[0].split('=')[1];
  });

  it('mesma chave de compra repete a resposta sem duplicar compra/despesa', async () => {
    const body = {
      fornecedorId: supplierId,
      itens: [{ produtoId: productId, quantidade: 0.5, valorUnitario: 0.01 }],
    };
    const key = randomUUID();
    const first = await api
      .post('/api/compras')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key)
      .send(body)
      .expect(201);
    purchaseIds.push(first.body.id);
    const repeated = await api
      .post('/api/compras')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key)
      .send(body)
      .expect(201);
    expect(repeated.body.id).toBe(first.body.id);
    expect(Number(first.body.valorTotal)).toBe(0.01);
    expect(
      await prisma.despesa.count({ where: { compraId: first.body.id } }),
    ).toBe(1);
    await api
      .post('/api/compras')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key)
      .send({ ...body, observacoes: 'Outra operação' })
      .expect(409);
  });

  it('confirmação de senha de outra sessão do mesmo usuário não autoriza ação crítica', async () => {
    const confirmation = await new JwtService().signAsync(
      {
        purpose: 'reautenticacao',
        sub: userId,
        sid: new JwtService().decode<{ sid: string }>(token).sid,
      },
      {
        issuer: jwtPolicy.issuer,
        audience: jwtPolicy.audience,
        secret: accessSecret,
        algorithm: 'HS256',
        expiresIn: 600,
      },
    );
    const otherToken = await accessFor(userId!, 'ADMINISTRADOR');
    await api
      .patch(`/api/usuarios/${userId}/acesso`)
      .set('Authorization', `Bearer ${otherToken}`)
      .set('X-Reautenticacao', confirmation)
      .send({ cargo: 'ADMINISTRADOR' })
      .expect(403);
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
