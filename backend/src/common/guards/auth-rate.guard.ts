import { createHash } from 'node:crypto';
import { Injectable, type ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AuthRateGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    return !(
      context.getClass().name === 'AuthController' &&
      context.getHandler().name === 'login'
    );
  }
  protected async getTracker(req: {
    body?: { email?: unknown };
  }): Promise<string> {
    const email =
      typeof req.body?.email === 'string'
        ? req.body.email.trim().toLowerCase().slice(0, 180)
        : '';
    return createHash('sha256').update(email).digest('hex');
  }
}
