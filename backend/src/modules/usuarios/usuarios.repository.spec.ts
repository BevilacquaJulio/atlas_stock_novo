import { describe, expect, it, vi } from 'vitest';
import { UsuariosRepository, usuarioSelect } from './usuarios.repository';
import type { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '../../../generated/prisma/client';

function setup() {
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([{ id: 1 }, { id: BigInt(5) }]),
    usuario: {
      update: vi.fn().mockResolvedValue({ id: 2 }),
      create: vi.fn().mockResolvedValue({ id: 3 }),
    },
  };
  const prisma = {
    usuario: {
      findUnique: vi.fn().mockResolvedValue({ id: 2 }),
      create: vi.fn().mockResolvedValue({ id: 3 }),
    },
    withAudit: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const repo = new UsuariosRepository(prisma as unknown as PrismaService);
  return {
    repo,
    prisma,
    tx: tx as unknown as Prisma.TransactionClient,
    rawTx: tx,
  };
}

describe('UsuariosRepository — acessos', () => {
  it('lê a senha só para reautenticação, com o mínimo de campos', async () => {
    const { repo, prisma } = setup();
    await repo.findByIdWithSenha(2);
    expect(prisma.usuario.findUnique).toHaveBeenCalledWith({
      where: { id: 2 },
    });
  });

  it('a projeção pública inclui a permissão financeira e nunca a senha', () => {
    expect(usuarioSelect).toMatchObject({ acessoFinanceiro: true });
    expect(usuarioSelect).not.toHaveProperty('senha');
  });

  it('cria com a permissão financeira e devolve a projeção pública', async () => {
    const { repo, rawTx } = setup();
    const data = {
      nome: 'N',
      email: 'n@example.test',
      senha: 'hash',
      cargo: 'GERENTE' as const,
      acessoFinanceiro: true,
    };
    await repo.create(data);
    expect(rawTx.usuario.create).toHaveBeenCalledWith({
      data,
      select: usuarioSelect,
    });
  });

  it('trava os administradores ativos com FOR UPDATE e normaliza os ids', async () => {
    const { repo, tx, rawTx } = setup();
    await expect(repo.travarAdministradoresAtivos(tx)).resolves.toEqual([1, 5]);
    const sql = (rawTx.$queryRaw.mock.calls[0][0] as string[]).join('?');
    expect(sql).toMatch(/cargo = 'ADMINISTRADOR' AND ativo = true/);
    expect(sql).toMatch(/FOR UPDATE/);
  });

  it('atualiza dentro da transação recebida', async () => {
    const { repo, tx, rawTx, prisma } = setup();
    const data = {
      cargo: 'OPERADOR' as const,
      ativo: false,
      acessoFinanceiro: false,
    };
    await repo.runInTransaction((t) => repo.update(2, data, t));
    expect(prisma.withAudit).toHaveBeenCalled();
    expect(rawTx.usuario.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data,
      select: usuarioSelect,
    });
    void tx;
  });
});
