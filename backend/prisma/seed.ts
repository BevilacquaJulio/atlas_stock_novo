import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '../generated/prisma/client';
import { buildDatabaseConfig } from '../src/config/database-url';

function requireSeedEnv(name: string, minLength = 1): string {
  const value = process.env[name]?.trim();
  if (!value || value.length < minLength) {
    throw new Error(
      `A variável ${name} é obrigatória para executar o seed${
        minLength > 1 ? ` e deve ter ao menos ${minLength} caracteres` : ''
      }.`,
    );
  }
  return value;
}

const adminEmail = requireSeedEnv('SEED_ADMIN_EMAIL');
const adminSenha = requireSeedEnv('SEED_ADMIN_PASSWORD', 12);
const financeiroSenha = requireSeedEnv('SEED_FINANCEIRO_SENHA', 12);

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(buildDatabaseConfig()),
});

async function main(): Promise<void> {
  const senhaHash = await bcrypt.hash(adminSenha, 10);
  await prisma.usuario.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      nome: 'Administrador',
      email: adminEmail,
      senha: senhaHash,
      cargo: 'ADMINISTRADOR',
    },
  });

  const categorias = ['Vidros', 'Aço', 'Manta Balística', 'Acessórios'];
  for (const nome of categorias) {
    await prisma.categoria.upsert({
      where: { nome },
      update: {},
      create: { nome },
    });
  }

  const categoriasDespesa = ['Operacional', 'Materiais', 'Salários', 'Impostos'];
  for (const nome of categoriasDespesa) {
    await prisma.categoriaDespesa.upsert({
      where: { nome },
      update: {},
      create: { nome },
    });
  }

  const financeiroSenhaHash = await bcrypt.hash(financeiroSenha, 10);
  await prisma.configSistema.upsert({
    where: { id: 1 },
    update: { financeiroSenhaHash },
    create: { id: 1, financeiroSenhaHash },
  });

  // eslint-disable-next-line no-console
  console.log(`Seed concluído. Administrador configurado: ${adminEmail}.`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
