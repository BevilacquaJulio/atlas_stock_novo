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

  findById(id: number) {
    return this.prisma.usuario.findUnique({
      where: { id },
      select: usuarioSelect,
    });
  }

  create(data: {
    nome: string;
    email: string;
    senha: string;
    cargo: Cargo;
  }) {
    return this.prisma.usuario.create({ data, select: usuarioSelect });
  }

  async list() {
    return this.prisma.usuario.findMany({
      select: usuarioSelect,
      orderBy: { nome: 'asc' },
    });
  }
}
