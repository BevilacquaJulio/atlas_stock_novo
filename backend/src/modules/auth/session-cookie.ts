import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';

export const REFRESH_COOKIE = 'atlas_refresh';

function options(config: ConfigService): CookieOptions {
  return {
    httpOnly: true,
    secure:
      config.get<string>(
        'COOKIE_SECURE',
        config.get<string>('NODE_ENV') === 'production' ? 'true' : 'false',
      ) === 'true',
    sameSite: 'strict',
    path: '/api/auth',
  };
}

export function setRefreshCookie(
  res: Response,
  config: ConfigService,
  token: string,
): void {
  res.cookie(REFRESH_COOKIE, token, {
    ...options(config),
    maxAge: Number(config.get('REFRESH_TOKEN_TTL_SECONDS', 604800)) * 1000,
  });
  res.setHeader('Cache-Control', 'no-store');
}

export function clearRefreshCookie(res: Response, config: ConfigService): void {
  res.clearCookie(REFRESH_COOKIE, options(config));
  res.setHeader('Cache-Control', 'no-store');
}

export function readRefreshCookie(req: Request): string {
  const cookie = req.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${REFRESH_COOKIE}=`));
  const value = cookie?.slice(REFRESH_COOKIE.length + 1);
  if (!value || !/^[A-Za-z0-9_-]{43}$/.test(value))
    throw new UnauthorizedException('Sessão expirada. Faça login novamente.');
  return value;
}

export function requireBrowserOrigin(
  req: Request,
  config: ConfigService,
): void {
  const origins = config
    .get<string>('CORS_ORIGIN', 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim());
  // Cabeçalho customizado exige preflight; Origin exato evita CSRF inclusive no login.
  if (
    req.headers['x-atlas-client'] !== 'web' ||
    !req.headers.origin ||
    !origins.includes(req.headers.origin)
  ) {
    throw new ForbiddenException('Origem da requisição não permitida.');
  }
}
