export function assertTestEnvironment(): void {
  const expected = {
    NODE_ENV: 'test',
    ALLOW_TEST_DATABASE: 'true',
    MYSQL_HOST: '127.0.0.1',
    MYSQL_PORT: '13316',
    MYSQL_DATABASE: 'atlas_audit_test',
    MYSQL_USER: 'atlas_audit',
    MYSQL_SSL: 'false',
  };
  for (const [key, value] of Object.entries(expected)) {
    if (process.env[key] !== value)
      throw new Error(`E2E recusado: banco não isolado (${key}).`);
  }
  for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    if (!process.env[key]?.startsWith('synthetic-e2e-'))
      throw new Error(`E2E requer ${key} sintético.`);
  }
}
