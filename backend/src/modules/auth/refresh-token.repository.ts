import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}
  withUserLock<T>(
    usuarioId: number,
    run: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.withAudit(async (tx) => {
      await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${usuarioId} FOR UPDATE`;
      return run(tx);
    });
  }
  findByHash(tokenHash: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).refreshToken.findFirst({
      where: { tokenHash },
      include: { sessao: true },
    });
  }
  create(
    usuarioId: number,
    sessaoId: string,
    tokenHash: string,
    expiresAt: Date,
    tx: Prisma.TransactionClient,
  ) {
    return tx.refreshToken.create({
      data: { usuarioId, sessaoId, tokenHash, expiresAt },
    });
  }
  revoke(id: number, tx: Prisma.TransactionClient) {
    return tx.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }
  async revokeSession(sessaoId: string, tx: Prisma.TransactionClient) {
    await tx.sessao.updateMany({
      where: { id: sessaoId, revogadoEm: null },
      data: { revogadoEm: new Date() },
    });
    await tx.refreshToken.updateMany({
      where: { sessaoId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  async revokeAllForUser(usuarioId: number, tx: Prisma.TransactionClient) {
    await tx.sessao.updateMany({
      where: { usuarioId, revogadoEm: null },
      data: { revogadoEm: new Date() },
    });
    await tx.refreshToken.updateMany({
      where: { usuarioId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
