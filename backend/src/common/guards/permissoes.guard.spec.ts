import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PermissoesGuard } from './permissoes.guard';
import { RolesGuard } from './roles.guard';
import { jwtPolicy } from '../auth/jwt-policy';
import {
  AcessoFinanceiro,
  ExigeReautenticacao,
  InativacaoRestrita,
} from '../decorators/permissoes.decorator';
import { Public } from '../decorators/public.decorator';
import { Roles } from '../decorators/roles.decorator';
import type { AuthenticatedUser } from '../types/authenticated-user';

const SECRET = 'segredo-sintetico-de-teste-apenas';
const jwt = new JwtService();
const config = new ConfigService({ JWT_ACCESS_SECRET: SECRET });
const guard = new PermissoesGuard(new Reflector(), jwt, config);
const rolesGuard = new RolesGuard(new Reflector());

class Rotas {
  @AcessoFinanceiro()
  financeiro() {}

  @AcessoFinanceiro()
  @ExigeReautenticacao()
  pagar() {}

  @Roles('ADMINISTRADOR', 'GERENTE', 'OPERADOR')
  @InativacaoRestrita()
  editar() {}

  semRegra() {}

  @Public()
  publica() {}
}

const usuario = (over: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
  id: 7,
  sessaoId: '11111111-1111-4111-8111-111111111111',
  nome: 'Sintético',
  email: 's@example.test',
  cargo: 'GERENTE',
  acessoFinanceiro: false,
  ...over,
});

function contexto(
  handler: keyof Rotas,
  user: AuthenticatedUser | undefined,
  extras: { headers?: Record<string, string>; body?: unknown } = {},
) {
  const request = { user, headers: extras.headers ?? {}, body: extras.body };
  return {
    getHandler: () => Rotas.prototype[handler],
    getClass: () => Rotas,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

const tokenDe = (payload: object, secret = SECRET) =>
  jwt.signAsync(
    { sid: '11111111-1111-4111-8111-111111111111', ...payload },
    {
      issuer: jwtPolicy.issuer,
      audience: jwtPolicy.audience,
      algorithm: 'HS256',
      secret,
      expiresIn: 600,
    },
  );

async function codigo(promise: Promise<unknown>) {
  try {
    await promise;
    return 'liberado';
  } catch (error) {
    expect(error).toBeInstanceOf(ForbiddenException);
    const res = (error as ForbiddenException).getResponse();
    return typeof res === 'object' && 'code' in res
      ? String(res.code)
      : 'FORBIDDEN';
  }
}

describe('RolesGuard', () => {
  it('nega rota sem regra declarada e libera rota pública', () => {
    expect(() =>
      rolesGuard.canActivate(contexto('semRegra', usuario())),
    ).toThrow('Rota sem regra de acesso declarada.');
    expect(rolesGuard.canActivate(contexto('publica', undefined))).toBe(true);
  });

  it('aceita @AcessoFinanceiro como regra declarada (o filtro fica no PermissoesGuard)', () => {
    expect(rolesGuard.canActivate(contexto('financeiro', usuario()))).toBe(
      true,
    );
  });
});

describe('PermissoesGuard', () => {
  it('financeiro: nega quem não tem a permissão efetiva', async () => {
    expect(
      await codigo(guard.canActivate(contexto('financeiro', usuario()))),
    ).toBe('ACESSO_FINANCEIRO_NEGADO');
    expect(
      await codigo(
        guard.canActivate(
          contexto('financeiro', usuario({ acessoFinanceiro: true })),
        ),
      ),
    ).toBe('liberado');
  });

  it('ação crítica: exige token de reautenticação do próprio usuário', async () => {
    const user = usuario({ acessoFinanceiro: true });
    const ok = await tokenDe({ purpose: 'reautenticacao', sub: user.id });
    const casos: [string, Record<string, string>][] = [
      ['sem header', {}],
      [
        'outro usuário',
        {
          'x-reautenticacao': await tokenDe({
            purpose: 'reautenticacao',
            sub: 99,
          }),
        },
      ],
      [
        'outra finalidade',
        {
          'x-reautenticacao': await tokenDe({
            purpose: 'access',
            sub: user.id,
          }),
        },
      ],
      [
        'outro segredo',
        {
          'x-reautenticacao': await tokenDe(
            { purpose: 'reautenticacao', sub: user.id },
            'outro-segredo-sintetico-x',
          ),
        },
      ],
      ['lixo', { 'x-reautenticacao': 'nao-e-jwt' }],
    ];
    for (const [, headers] of casos) {
      expect(
        await codigo(guard.canActivate(contexto('pagar', user, { headers }))),
      ).toBe('REAUTENTICACAO_NECESSARIA');
    }
    expect(
      await codigo(
        guard.canActivate(
          contexto('pagar', user, { headers: { 'x-reautenticacao': ok } }),
        ),
      ),
    ).toBe('liberado');
  });

  it('ação crítica: a reautenticação não substitui a permissão financeira', async () => {
    const user = usuario({ acessoFinanceiro: false });
    const ok = await tokenDe({ purpose: 'reautenticacao', sub: user.id });
    expect(
      await codigo(
        guard.canActivate(
          contexto('pagar', user, { headers: { 'x-reautenticacao': ok } }),
        ),
      ),
    ).toBe('ACESSO_FINANCEIRO_NEGADO');
  });

  it('edição: só a gestão envia o campo ativo', async () => {
    const operador = usuario({ cargo: 'OPERADOR' });
    expect(
      await codigo(
        guard.canActivate(
          contexto('editar', operador, { body: { ativo: false } }),
        ),
      ),
    ).toBe('FORBIDDEN');
    expect(
      await codigo(
        guard.canActivate(
          contexto('editar', operador, { body: { nome: 'x' } }),
        ),
      ),
    ).toBe('liberado');
    expect(
      await codigo(
        guard.canActivate(
          contexto('editar', usuario(), { body: { ativo: false } }),
        ),
      ),
    ).toBe('liberado');
  });
});
