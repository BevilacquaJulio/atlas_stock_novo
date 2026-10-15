import { describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthController } from './auth.controller';
import type { AuthService } from './auth.service';
import { readRefreshCookie, requireBrowserOrigin } from './session-cookie';

function fixture() {
  const cookie = vi.fn();
  const clearCookie = vi.fn();
  const setHeader = vi.fn();
  const res = { cookie, clearCookie, setHeader } as unknown as Response;
  const req = {
    headers: {
      origin: 'https://atlas.example',
      'x-atlas-client': 'web',
      cookie: `other=ignored; atlas_refresh=${'a'.repeat(43)}`,
    },
  } as unknown as Request;
  const config = new ConfigService({
    NODE_ENV: 'production',
    CORS_ORIGIN: 'https://atlas.example',
  });
  const service = {
    login: vi.fn().mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'a'.repeat(43),
      user: { id: 1 },
    }),
    refresh: vi.fn().mockResolvedValue({
      accessToken: 'rotated-access',
      refreshToken: 'b'.repeat(43),
    }),
    logout: vi.fn().mockResolvedValue(undefined),
  };
  return {
    req,
    res,
    cookie,
    clearCookie,
    setHeader,
    config,
    service,
    controller: new AuthController(service as unknown as AuthService, config),
  };
}

describe('contrato HTTP de refresh', () => {
  it('login retira refresh do JSON e usa cookie protegido sem cache', async () => {
    const f = fixture();
    await expect(
      f.controller.login(
        { email: 'user@example.test', senha: 'synthetic-password' },
        f.req,
        f.res,
      ),
    ).resolves.toEqual({ accessToken: 'access', user: { id: 1 } });
    expect(f.cookie).toHaveBeenCalledWith('atlas_refresh', 'a'.repeat(43), {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: 604800000,
    });
    expect(f.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
  });
  it('refresh lê cookie, entrega só access e mantém os atributos na rotação', async () => {
    const f = fixture();
    await expect(f.controller.refresh(f.req, f.res)).resolves.toEqual({
      accessToken: 'rotated-access',
    });
    expect(f.service.refresh).toHaveBeenCalledWith('a'.repeat(43));
    expect(f.cookie).toHaveBeenCalledWith(
      'atlas_refresh',
      'b'.repeat(43),
      expect.objectContaining({ httpOnly: true, secure: true }),
    );
  });
  it('limpa cookie no 401, preservando-o em indisponibilidade do servidor', async () => {
    const f = fixture();
    f.service.refresh.mockRejectedValueOnce(new UnauthorizedException());
    await expect(f.controller.refresh(f.req, f.res)).rejects.toThrow();
    expect(f.clearCookie).toHaveBeenCalledWith('atlas_refresh', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/api/auth',
    });
    f.clearCookie.mockClear();
    f.service.refresh.mockRejectedValueOnce(new Error('temporary-unavailable'));
    await expect(f.controller.refresh(f.req, f.res)).rejects.toThrow(
      'temporary-unavailable',
    );
    expect(f.clearCookie).not.toHaveBeenCalled();
  });
  it('logout ausente/expirado é idempotente e repete o escopo ao limpar', async () => {
    const f = fixture();
    f.req.headers.cookie = '';
    await f.controller.logout(f.req, f.res);
    expect(f.service.logout).not.toHaveBeenCalled();
    expect(f.clearCookie).toHaveBeenCalled();
    f.req.headers.cookie = `atlas_refresh=${'a'.repeat(43)}`;
    await f.controller.logout(f.req, f.res);
    expect(f.service.logout).toHaveBeenCalledWith('a'.repeat(43));
  });
  it.each([
    {},
    { origin: 'https://evil.example', 'x-atlas-client': 'web' },
    { origin: 'https://atlas.example' },
    { origin: 'null', 'x-atlas-client': 'web' },
  ])('recusa origem/cabeçalhos inadequados antes do serviço', (headers) => {
    const f = fixture();
    expect(() =>
      requireBrowserOrigin({ headers } as Request, f.config),
    ).toThrow('Origem da requisição');
    expect(f.service.login).not.toHaveBeenCalled();
  });
  it.each([
    '',
    'atlas_refresh=short',
    `atlas_refresh=${'x'.repeat(2048)}`,
    'atlas_refresh=invalid%20cookie',
  ])('recusa cookie malformado', (cookie) =>
    expect(() =>
      readRefreshCookie({ headers: { cookie } } as Request),
    ).toThrow(),
  );
});
