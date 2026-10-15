import { describe, expect, it, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { ThrottlerStorageService } from '@nestjs/throttler';
import { AuthRateGuard } from './auth-rate.guard';
import { AuthController } from '../../modules/auth/auth.controller';

describe('limite de autenticação por conta', () => {
  it('agrega e-mail normalizado mesmo quando o IP muda', async () => {
    const storage = new ThrottlerStorageService();
    const guard = new AuthRateGuard(
      [{ name: 'default', limit: 10, ttl: 60000 }],
      storage,
      new Reflector(),
    );
    await guard.onModuleInit();
    const req = {
      ip: '192.0.2.1',
      headers: {},
      body: { email: 'User@example.test' },
    };
    const context = {
      getHandler: () => AuthController.prototype.login,
      getClass: () => AuthController,
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({ header: vi.fn() }),
      }),
    } as unknown as ExecutionContext;
    try {
      for (let i = 0; i < 10; i++) {
        req.ip = `192.0.2.${i + 1}`;
        req.body.email = i % 2 ? ' user@example.test ' : 'User@example.test';
        expect(await guard.canActivate(context)).toBe(true);
      }
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Too Many Requests',
      );
    } finally {
      storage.onApplicationShutdown();
    }
  });
});
