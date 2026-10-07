import { PrismaService } from '../src/prisma/prisma.service';

export function testDatabase(): PrismaService {
  const expected = {
    NODE_ENV: 'test', ALLOW_TEST_DATABASE: 'true', MYSQL_HOST: '127.0.0.1',
    MYSQL_PORT: '13316', MYSQL_DATABASE: 'atlas_audit_test', MYSQL_USER: 'atlas_audit', MYSQL_SSL: 'false',
  };
  for (const [key, value] of Object.entries(expected)) {
    if (process.env[key] !== value) throw new Error(`Banco de teste recusado: ${key}.`);
  }
  return new PrismaService();
}
