import { afterEach, describe, expect, it } from 'vitest';
import { Controller, Get, Post, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request } from 'express';
import request from 'supertest';
import { configureApp } from './configure-app';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';

@Controller('probe')
class ProbeController {
  @Get()
  get() {
    return { ok: true };
  }

  @Post()
  post(@Req() req: Request) {
    return { body: req.body };
  }
}

let app: NestExpressApplication | undefined;
afterEach(async () => {
  await app?.close();
});

async function start(mode = 'production') {
  const module = await Test.createTestingModule({
    controllers: [ProbeController],
    providers: [
      {
        provide: ConfigService,
        useValue: new ConfigService({
          NODE_ENV: mode,
          CORS_ORIGIN: 'https://app.example.test, https://admin.example.test',
        }),
      },
    ],
  }).compile();
  app = module.createNestApplication<NestExpressApplication>({
    bodyParser: false,
    logger: false,
  });
  configureApp(app);
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
  return request(app.getHttpServer());
}

describe('configuração HTTP compartilhada com produção', () => {
  it('aplica prefixo, headers de segurança, ID próprio e lista de origens CORS', async () => {
    const api = await start();
    const response = await api
      .get('/api/probe')
      .set('Origin', 'https://admin.example.test')
      .set('X-Request-Id', 'attacker')
      .expect(200);
    expect(response.body).toEqual({ ok: true });
    expect(response.headers['x-request-id']).toMatch(/^[a-f0-9-]{36}$/);
    expect(response.headers['x-request-id']).not.toBe('attacker');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['access-control-allow-origin']).toBe(
      'https://admin.example.test',
    );
    expect(response.headers['access-control-allow-credentials']).toBe('true');
    expect(response.headers['access-control-expose-headers']).toContain(
      'X-Request-Id',
    );
    const denied = await api
      .get('/api/probe')
      .set('Origin', 'https://attacker.test')
      .expect(200);
    expect(denied.headers).not.toHaveProperty('access-control-allow-origin');
    await api.get('/probe').expect(404);
    await api.get('/api/docs').expect(404);
  });

  it('aceita JSON e formulário, mas limita o corpo e sanitiza JSON inválido', async () => {
    const api = await start();
    const json = await api
      .post('/api/probe')
      .send({ value: 'hello' })
      .expect(201);
    expect(json.body).toEqual({ body: { value: 'hello' } });
    const form = await api
      .post('/api/probe')
      .type('form')
      .send({ value: 'hello' })
      .expect(201);
    expect(form.body).toEqual({ body: { value: 'hello' } });
    const invalid = await api
      .post('/api/probe')
      .type('json')
      .send('{"secret":')
      .expect(400);
    expect(invalid.body.error).toMatchObject({
      code: 'BAD_REQUEST',
      message: 'JSON inválido.',
      requestId: invalid.headers['x-request-id'],
    });
    expect(JSON.stringify(invalid.body)).not.toContain('secret');
    const oversized = await api
      .post('/api/probe')
      .send({ value: 'x'.repeat(101 * 1024) })
      .expect(413);
    expect(oversized.body.error.code).toBe('PAYLOAD_TOO_LARGE');
    const oversizedForm = await api
      .post('/api/probe')
      .type('form')
      .send({ value: 'x'.repeat(101 * 1024) })
      .expect(413);
    expect(oversizedForm.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('disponibiliza OpenAPI somente fora de produção', async () => {
    const api = await start('development');
    const response = await api.get('/api/docs-json').expect(200);
    expect(response.body.info.title).toBe('Atlas Stock API');
    expect(response.body.paths).toHaveProperty('/api/probe');
    expect(response.body.components.securitySchemes.bearer.type).toBe('http');
  });
});
