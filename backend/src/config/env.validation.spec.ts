import { describe, expect, it } from 'vitest';
import { envSchema } from './env.validation';

const valid = {
  MYSQL_HOST: 'localhost',
  MYSQL_USER: 'synthetic',
  MYSQL_DATABASE: 'synthetic',
  JWT_ACCESS_SECRET: 'synthetic-access-secret-for-testing-only',
};

describe('configuração de JWT', () => {
  it('aceita somente origens CORS exatas e portas válidas', () => {
    expect(
      envSchema.safeParse({
        ...valid,
        CORS_ORIGIN: 'http://localhost:5173,https://atlas.example',
      }).success,
    ).toBe(true);
    for (const CORS_ORIGIN of [
      '*',
      'https://atlas.example/api',
      'https://user:password@atlas.example',
      'null',
      '',
    ]) {
      expect(envSchema.safeParse({ ...valid, CORS_ORIGIN }).success).toBe(
        false,
      );
    }
    expect(envSchema.safeParse({ ...valid, PORT: 65536 }).success).toBe(false);
  });
  it('recusa segredo curto e placeholder em produção', () => {
    expect(
      envSchema.safeParse({ ...valid, JWT_ACCESS_SECRET: 'short' }).success,
    ).toBe(false);
    expect(
      envSchema.safeParse({
        ...valid,
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: 'troque-por-um-segredo-forte-de-32-chars',
      }).success,
    ).toBe(false);
  });

  it('limita confiança de proxy a IPs/CIDRs e cookie inseguro ao domínio local', () => {
    for (const TRUST_PROXY of [
      'true',
      '1',
      '*',
      '10.0.0.1/99',
      'proxy.example',
    ])
      expect(envSchema.safeParse({ ...valid, TRUST_PROXY }).success).toBe(
        false,
      );
    expect(
      envSchema.safeParse({ ...valid, TRUST_PROXY: '127.0.0.1/32,::1/128' })
        .success,
    ).toBe(true);
    expect(
      envSchema.safeParse({
        ...valid,
        NODE_ENV: 'production',
        COOKIE_SECURE: 'false',
        CORS_ORIGIN: 'https://atlas.example',
      }).success,
    ).toBe(false);
    expect(
      envSchema.safeParse({
        ...valid,
        NODE_ENV: 'production',
        COOKIE_SECURE: 'false',
        CORS_ORIGIN: 'http://atlas.localhost',
      }).success,
    ).toBe(true);
  });
  it('recusa duração inválida, zero e access longo', () => {
    for (const JWT_ACCESS_EXPIRES_IN of ['abc', '0m', '24h', '900']) {
      expect(
        envSchema.safeParse({ ...valid, JWT_ACCESS_EXPIRES_IN }).success,
      ).toBe(false);
    }
    expect(
      envSchema.safeParse({ ...valid, REFRESH_TOKEN_TTL_SECONDS: 31536000 })
        .success,
    ).toBe(false);
    expect(envSchema.safeParse(valid).success).toBe(true);
  });
});
