import path from 'node:path';
import { defineConfig } from 'prisma/config';
import { buildDatabaseUrl } from './src/config/database-url';

/**
 * Configuração do Prisma 7.
 *
 * O datasource NÃO tem `url` no schema.prisma — a conexão vive aqui. Em
 * runtime o PrismaService usa o driver adapter mariadb (obrigatório no
 * Prisma 7); a CLI (migrate/introspect) usa a `url` abaixo. A URL é montada
 * a partir das variáveis MYSQL_* (com senha url-encoded). A CLI do Prisma
 * carrega o .env automaticamente antes de avaliar este arquivo.
 */
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: buildDatabaseUrl(),
  },
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'ts-node prisma/seed.ts',
  },
});
