import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../../../generated/prisma/client';
import { demoAccount, seedDemoAccount } from './demo-account';
import { hashPassword, verifyPassword } from './password';
const demoPassword = 'synthetic-demo-password';

function repository(existing: unknown = null) {
  const usuario = {
    findUnique: vi.fn().mockResolvedValue(existing),
    create: vi.fn().mockImplementation(({ data }) => Promise.resolve(data)),
  };
  return {
    usuario,
    prisma: { usuario } as unknown as Pick<PrismaClient, 'usuario'>,
  };
}
describe('conta de demonstração', () => {
  it('cria um operador sem financeiro e armazena a senha pública apenas como Argon2id', async () => {
    const { prisma, usuario } = repository();
    await seedDemoAccount(prisma, demoPassword);
    const { data } = usuario.create.mock.calls[0][0];
    expect(data).toMatchObject({
      email: demoAccount.email,
      cargo: 'OPERADOR',
      acessoFinanceiro: false,
      ativo: true,
    });
    expect(data.senha).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(data.senha, demoPassword)).toBe(true);
  });
  it('não substitui nem rebaixa uma conta existente com o e-mail demo', async () => {
    const { prisma, usuario } = repository({
      cargo: 'ADMINISTRADOR',
      acessoFinanceiro: true,
      ativo: true,
    });
    await expect(seedDemoAccount(prisma, demoPassword)).rejects.toThrow(
      'Nenhuma conta foi alterada',
    );
    expect(usuario.create).not.toHaveBeenCalled();
  });
  it('reexecutar o seed preserva a conta demo existente', async () => {
    const existing = {
      cargo: 'OPERADOR',
      acessoFinanceiro: false,
      ativo: true,
      senha: await hashPassword(demoPassword),
    };
    const { prisma, usuario } = repository(existing);
    expect(await seedDemoAccount(prisma, demoPassword)).toBe(existing);
    expect(usuario.create).not.toHaveBeenCalled();
  });
  it('recusa configuração ausente ou inválida antes de acessar o banco', async () => {
    const { prisma, usuario } = repository();
    await expect(seedDemoAccount(prisma, '')).rejects.toThrow(
      'SEED_DEMO_PASSWORD',
    );
    expect(usuario.findUnique).not.toHaveBeenCalled();
    expect(usuario.create).not.toHaveBeenCalled();
  });
});
