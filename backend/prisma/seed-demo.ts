import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client';
import { buildDatabaseConfig } from '../src/config/database-url';
import { seedDemoAccount } from '../src/common/auth/demo-account';

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(buildDatabaseConfig()),
});
seedDemoAccount(prisma)
  .then(() =>
    console.log('Conta de demonstração disponível com perfil Operador.'),
  )
  .catch(() => {
    console.error(
      'Não foi possível preparar a conta de demonstração. Confira conexão, migrations e disponibilidade do e-mail.',
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
