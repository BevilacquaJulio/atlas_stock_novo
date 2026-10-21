import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../../../generated/prisma/client';
import { demoAccount, seedDemoAccount } from './demo-account';
import { hashPassword, verifyPassword } from './password';

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
    await seedDemoAccount(prisma);
    const { data } = usuario.create.mock.calls[0][0];
    expect(data).toMatchObject({
      email: demoAccount.email,
      cargo: 'OPERADOR',
      acessoFinanceiro: false,
      ativo: true,
    });
    expect(data.senha).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(data.senha, demoAccount.password)).toBe(true);
  });
  it('não substitui nem rebaixa uma conta existente com o e-mail demo', async () => {
    const { prisma, usuario } = repository({
      cargo: 'ADMINISTRADOR',
      acessoFinanceiro: true,
      ativo: true,
    });
    await expect(seedDemoAccount(prisma)).rejects.toThrow(
      'Nenhuma conta foi alterada',
    );
    expect(usuario.create).not.toHaveBeenCalled();
  });
  it('reexecutar o seed preserva a conta demo existente', async () => {
    const existing = {
      cargo: 'OPERADOR',
      acessoFinanceiro: false,
      ativo: true,
      senha: await hashPassword(demoAccount.password),
    };
    const { prisma, usuario } = repository(existing);
    expect(await seedDemoAccount(prisma)).toBe(existing);
    expect(usuario.create).not.toHaveBeenCalled();
  });
});
