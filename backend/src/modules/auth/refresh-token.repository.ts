import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  withUserLock<T>(usuarioId: number, run: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      // Serializa emissão, rotação e revogação para que reuso não deixe um sucessor ativo.
      await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${usuarioId} FOR UPDATE`;
      return run(tx);
    });
  }

  createEmpty(usuarioId: number, expiresAt: Date, tx: Prisma.TransactionClient) {
    return tx.refreshToken.create({
      data: { usuarioId, tokenHash: '', expiresAt },
    });
  }

  setHash(id: number, tokenHash: string, tx: Prisma.TransactionClient) {
    return tx.refreshToken.update({
      where: { id },
      data: { tokenHash },
    });
  }

  findById(id: number, tx: Prisma.TransactionClient) {
    return tx.refreshToken.findUnique({ where: { id } });
  }

  revoke(id: number, tx: Prisma.TransactionClient) {
    return tx.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  revokeAllForUser(usuarioId: number, tx: Prisma.TransactionClient) {
    return tx.refreshToken.updateMany({
      where: { usuarioId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
