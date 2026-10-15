import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Cargo, Prisma } from '../../../generated/prisma/client';

/** Campos seguros de usuário — NUNCA inclui `senha`. */
export const usuarioSelect = {
  id: true,
  nome: true,
  email: true,
  cargo: true,
  ativo: true,
  acessoFinanceiro: true,
  createdAt: true,
  updatedAt: true,
  mfaAtivo: true,
} satisfies Prisma.UsuarioSelect;

@Injectable()
export class UsuariosRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Inclui a senha (hash) — uso restrito à autenticação. */
  findByEmailWithSenha(email: string) {
    return this.prisma.usuario.findUnique({ where: { email } });
  }

  findByEmail(email: string) {
    return this.prisma.usuario.findUnique({
      where: { email },
      select: usuarioSelect,
    });
  }

  findById(id: number, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).usuario.findUnique({
      where: { id },
      select: usuarioSelect,
    });
  }

  /** Inclui a senha (hash) — uso restrito à reautenticação. */
  findByIdWithSenha(id: number, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).usuario.findUnique({
      where: { id },
    });
  }

  findSession(id: string, usuarioId: number) {
    return this.prisma.sessao.findFirst({
      where: { id, usuarioId, revogadoEm: null, expiraEm: { gt: new Date() } },
    });
  }

  listSessions(usuarioId: number) {
    return this.prisma.sessao.findMany({
      where: { usuarioId, revogadoEm: null, expiraEm: { gt: new Date() } },
      select: { id: true, criadoEm: true, expiraEm: true },
      orderBy: { criadoEm: 'desc' },
      take: 100,
    });
  }

  findRecovery(resumoToken: string) {
    return this.prisma.recuperacaoSenha.findUnique({ where: { resumoToken } });
  }

  create(data: {
    nome: string;
    email: string;
    senha: string;
    cargo: Cargo;
    acessoFinanceiro: boolean;
  }) {
    return this.prisma.withAudit((tx) =>
      tx.usuario.create({ data, select: usuarioSelect }),
    );
  }

  runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.withAudit(fn);
  }

  async revogarSessoes(usuarioId: number, tx: Prisma.TransactionClient) {
    await tx.sessao.updateMany({
      where: { usuarioId, revogadoEm: null },
      data: { revogadoEm: new Date() },
    });
    await tx.refreshToken.updateMany({
      where: { usuarioId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Trava os administradores ativos até o fim da transação e devolve os ids.
   * Alterações simultâneas de acesso ficam em fila e não conseguem, juntas,
   * deixar o sistema sem administrador.
   */
  async travarAdministradoresAtivos(
    tx: Prisma.TransactionClient,
  ): Promise<number[]> {
    const rows = await tx.$queryRaw<{ id: number }[]>`
      SELECT id FROM usuarios
      WHERE cargo = 'ADMINISTRADOR' AND ativo = true
      FOR UPDATE`;
    return rows.map((row) => Number(row.id));
  }

  update(
    id: number,
    data: { cargo: Cargo; ativo: boolean; acessoFinanceiro: boolean },
    tx: Prisma.TransactionClient,
  ) {
    return tx.usuario.update({ where: { id }, data, select: usuarioSelect });
  }

  async list({
    page = 1,
    limit = 25,
    search,
  }: { page?: number; limit?: number; search?: string } = {}) {
    return this.prisma.usuario.findMany({
      where: search
        ? {
            OR: [
              { nome: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {},
      skip: (page - 1) * limit,
      take: limit,
      select: usuarioSelect,
      orderBy: [{ nome: 'asc' }, { id: 'asc' }],
    });
  }
}
