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
  findByIdWithSenha(id: number) {
    return this.prisma.usuario.findUnique({
      where: { id },
      select: { id: true, ativo: true, senha: true },
    });
  }

  create(data: {
    nome: string;
    email: string;
    senha: string;
    cargo: Cargo;
    acessoFinanceiro: boolean;
  }) {
    return this.prisma.usuario.create({ data, select: usuarioSelect });
  }

  runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(fn);
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

  async list() {
    return this.prisma.usuario.findMany({
      select: usuarioSelect,
      orderBy: { nome: 'asc' },
    });
  }
}
