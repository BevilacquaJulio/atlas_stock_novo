import { describe, expect, it, vi } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import type { PrismaService } from '../../prisma/prisma.service';

describe('readiness', () => {
  it('responde 503 quando o banco está indisponível', async () => {
    const prisma = {
      $queryRaw: vi.fn().mockRejectedValue(new Error('connection failed')),
    };
    const controller = new HealthController(prisma as unknown as PrismaService);
    await expect(controller.readiness()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
