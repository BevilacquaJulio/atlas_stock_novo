import { describe, expect, it } from 'vitest';
import { envSchema } from './env.validation';

const valid = {
  MYSQL_HOST: 'localhost', MYSQL_USER: 'synthetic', MYSQL_DATABASE: 'synthetic',
  JWT_ACCESS_SECRET: 'synthetic-access-secret-for-testing-only',
  JWT_REFRESH_SECRET: 'synthetic-refresh-secret-for-testing-only',
};

describe('configuração de JWT', () => {
  it('recusa segredo curto, igual e placeholder em produção', () => {
    expect(envSchema.safeParse({ ...valid, JWT_ACCESS_SECRET: 'short' }).success).toBe(false);
    expect(envSchema.safeParse({ ...valid, JWT_REFRESH_SECRET: valid.JWT_ACCESS_SECRET }).success).toBe(false);
    expect(envSchema.safeParse({ ...valid, NODE_ENV: 'production', JWT_ACCESS_SECRET: 'troque-por-um-segredo-forte-de-32-chars' }).success).toBe(false);
  });
  it('recusa duração inválida, zero e access longo', () => {
    for (const JWT_ACCESS_EXPIRES_IN of ['abc', '0m', '24h', '900']) {
      expect(envSchema.safeParse({ ...valid, JWT_ACCESS_EXPIRES_IN }).success).toBe(false);
    }
    expect(envSchema.safeParse({ ...valid, JWT_REFRESH_EXPIRES_IN: '365d' }).success).toBe(false);
    expect(envSchema.safeParse(valid).success).toBe(true);
  });
});
