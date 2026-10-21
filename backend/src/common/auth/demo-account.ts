import type { PrismaClient } from '../../../generated/prisma/client';
import { hashPassword, verifyPassword } from './password';
import { newPasswordSchema } from '../validators/bounds';

export const demoAccount = {
  email: 'demo@atlas.com',
} as const;

export async function seedDemoAccount(
  prisma: Pick<PrismaClient, 'usuario'>,
  configuredPassword = process.env.SEED_DEMO_PASSWORD,
) {
  const parsed = newPasswordSchema.safeParse(configuredPassword);
  if (!parsed.success) {
    throw new Error('Configure SEED_DEMO_PASSWORD com uma senha demo válida.');
  }
  const password = parsed.data;
  const existing = await prisma.usuario.findUnique({
    where: { email: demoAccount.email },
  });
  if (existing) {
    if (
      existing.cargo !== 'OPERADOR' ||
      existing.acessoFinanceiro ||
      !existing.ativo ||
      !(await verifyPassword(existing.senha, password))
    ) {
      throw new Error(
        'O e-mail de demonstração já pertence a uma conta incompatível. Nenhuma conta foi alterada.',
      );
    }
    return existing;
  }
  return prisma.usuario.create({
    data: {
      nome: 'Demonstração',
      email: demoAccount.email,
      senha: await hashPassword(password),
      cargo: 'OPERADOR',
      acessoFinanceiro: false,
      ativo: true,
    },
  });
}
