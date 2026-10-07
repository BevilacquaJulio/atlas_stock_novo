import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(usuarioId: number, tokenHash: string, expiresAt: Date) {
    return this.prisma.refreshToken.create({
      data: { usuarioId, tokenHash, expiresAt },
    });
  }

  createEmpty(usuarioId: number, expiresAt: Date) {
    return this.prisma.refreshToken.create({
      data: { usuarioId, tokenHash: '', expiresAt },
    });
  }

  setHash(id: number, tokenHash: string) {
    return this.prisma.refreshToken.update({
      where: { id },
      data: { tokenHash },
    });
  }

  findById(id: number) {
    return this.prisma.refreshToken.findUnique({ where: { id } });
  }

  revoke(id: number) {
    return this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  revokeAllForUser(usuarioId: number) {
    return this.prisma.refreshToken.updateMany({
      where: { usuarioId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
