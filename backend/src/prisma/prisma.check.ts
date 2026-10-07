/**
 * Self-test de conexão, independente do Nest. Rode com `npm run prisma:check`.
 * Abre a conexão via adapter mariadb e executa um SELECT 1.
 */
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../../generated/prisma/client';
import { buildDatabaseUrl } from '../config/database-url';

async function main(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(buildDatabaseUrl()),
  });

  try {
    const result = await prisma.$queryRaw`SELECT 1 AS ok`;
    // eslint-disable-next-line no-console
    console.log('Conexão OK:', result);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Falha na conexão:', err);
  process.exit(1);
});
