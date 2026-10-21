import type { PrismaClient } from '../../../generated/prisma/client';
import { hashPassword, verifyPassword } from './password';

export const demoAccount = {
  email: 'demo@atlas.com',
  password: 'AtlasDemo2026!',
} as const;

export async function seedDemoAccount(prisma: Pick<PrismaClient, 'usuario'>) {
  const existing = await prisma.usuario.findUnique({
    where: { email: demoAccount.email },
  });
  if (existing) {
    if (
      existing.cargo !== 'OPERADOR' ||
      existing.acessoFinanceiro ||
      !existing.ativo ||
      !(await verifyPassword(existing.senha, demoAccount.password))
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
      senha: await hashPassword(demoAccount.password),
      cargo: 'OPERADOR',
      acessoFinanceiro: false,
      ativo: true,
    },
  });
}
