import { afterEach, describe, expect, it } from 'vitest';
import { buildDatabaseConfig, buildDatabaseUrl } from './database-url';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('database config', () => {
  it('força TLS na CLI e aceita certificado interno quando configurado', () => {
    process.env.MYSQL_HOST = 'mysql_shared';
    process.env.MYSQL_PORT = '3306';
    process.env.MYSQL_USER = 'atlas';
    process.env.MYSQL_PASSWORD = 'senha@com#caracteres';
    process.env.MYSQL_DATABASE = 'atlas_stock';
    process.env.MYSQL_SSL = 'true';
    process.env.MYSQL_SSL_REJECT_UNAUTHORIZED = 'false';
    process.env.MYSQL_SSL_CA_PATH = '/run/secrets/mysql-ca.pem';

    expect(buildDatabaseUrl()).toBe(
      'mysql://atlas:senha%40com%23caracteres@mysql_shared:3306/atlas_stock?charset=utf8mb4&sslcert=%2Frun%2Fsecrets%2Fmysql-ca.pem&sslaccept=accept_invalid_certs',
    );
    process.env.MYSQL_SSL_CA_PATH = __filename;
    expect(buildDatabaseConfig()).toMatchObject({
      host: 'mysql_shared',
      port: 3306,
      ssl: { rejectUnauthorized: false, ca: expect.any(Buffer) },
    });
  });

  it('não habilita TLS no desenvolvimento sem a variável', () => {
    delete process.env.MYSQL_SSL;

    expect(buildDatabaseUrl()).not.toContain('sslaccept');
    expect(buildDatabaseConfig()).not.toHaveProperty('ssl');
  });
});
