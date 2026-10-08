import { describe, expect, it } from 'vitest';
import { Writable } from 'node:stream';
import express from 'express';
import pinoHttp from 'pino-http';
import request from 'supertest';
import { httpLoggingOptions } from './http-logging';

describe('logs HTTP sem dados sensíveis', () => {
  it.each([undefined, 'server-generated-id'])(
    'correlaciona requisição e resposta sem registrar payload, query ou credenciais (%s)',
    async (serverId) => {
      const lines: string[] = [];
      const stream = new Writable({
        write(chunk, _encoding, done) {
          lines.push(String(chunk));
          done();
        },
      });
      const app = express();
      app.use(express.json());
      app.use((req, res, next) => {
        if (serverId) {
          req.id = serverId;
          res.setHeader('X-Request-Id', serverId);
        }
        next();
      });
      app.use(pinoHttp(httpLoggingOptions, stream));
      app.post('/probe', (_req, res) => {
        res.setHeader('Set-Cookie', 'secret-cookie');
        res.status(201).json({ ok: true });
      });
      const response = await request(app)
        .post('/probe?token=secret-query')
        .set('Authorization', 'Bearer secret-auth')
        .set('Cookie', 'secret-cookie')
        .set('X-Financeiro-Token', 'secret-financial')
        .set('X-Request-Id', 'untrusted')
        .send({ senha: 'secret-password' })
        .expect(201);
      const id = response.headers['x-request-id'];
      if (serverId) expect(id).toBe(serverId);
      else expect(id).toMatch(/^[a-f0-9-]{36}$/);
      expect(lines.length).toBeGreaterThan(0);
      const log = JSON.parse(lines[0]);
      expect(log.req).toEqual({ id, method: 'POST', path: '/probe' });
      expect(log.res).toEqual({ statusCode: 201 });
      expect(lines.join('')).not.toContain('secret-');
      expect(lines.join('')).not.toContain('untrusted');
    },
  );

  it('não serializa mensagem ou stack de erros internos', () => {
    const serializer = httpLoggingOptions.serializers?.err;
    expect(serializer?.(new Error('password=secret'))).toEqual({
      type: 'RequestError',
    });
    expect(httpLoggingOptions.serializers?.req({})).toEqual({
      id: undefined,
      method: undefined,
      path: undefined,
    });
  });
});
