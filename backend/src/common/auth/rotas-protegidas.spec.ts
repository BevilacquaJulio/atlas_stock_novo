import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod, type Type } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import {
  ACESSO_FINANCEIRO_KEY,
  INATIVACAO_RESTRITA_KEY,
  REAUTENTICACAO_KEY,
} from '../decorators/permissoes.decorator';
import { AuthController } from '../../modules/auth/auth.controller';
import { CategoriasController } from '../../modules/categorias/categorias.controller';
import { ClientesController } from '../../modules/clientes/clientes.controller';
import { ComprasController } from '../../modules/compras/compras.controller';
import { DashboardController } from '../../modules/dashboard/dashboard.controller';
import { FinanceiroController } from '../../modules/financeiro/financeiro.controller';
import { FornecedoresController } from '../../modules/fornecedores/fornecedores.controller';
import { HealthController } from '../../modules/health/health.controller';
import { MovimentacoesController } from '../../modules/movimentacoes/movimentacoes.controller';
import { ProdutosController } from '../../modules/produtos/produtos.controller';
import { ProjetosController } from '../../modules/projetos/projetos.controller';
import { UsuariosController } from '../../modules/usuarios/usuarios.controller';
import { VeiculosController } from '../../modules/veiculos/veiculos.controller';

const CONTROLLERS: Type[] = [
  AuthController,
  CategoriasController,
  ClientesController,
  ComprasController,
  DashboardController,
  FinanceiroController,
  FornecedoresController,
  HealthController,
  MovimentacoesController,
  ProdutosController,
  ProjetosController,
  UsuariosController,
  VeiculosController,
];

interface Rota {
  nome: string;
  publica: boolean;
  cargos: string[] | undefined;
  financeiro: boolean;
  reautenticacao: boolean;
  inativacaoRestrita: boolean;
}

/** Mesma precedência do Reflector.getAllAndOverride: handler, depois classe. */
function meta<T>(
  key: string,
  handler: object,
  controller: Type,
): T | undefined {
  return (
    (Reflect.getMetadata(key, handler) as T | undefined) ??
    (Reflect.getMetadata(key, controller) as T | undefined)
  );
}

function rotas(): Rota[] {
  return CONTROLLERS.flatMap((controller) => {
    const base = Reflect.getMetadata(PATH_METADATA, controller) as string;
    const proto = controller.prototype as Record<string, object>;
    return Object.getOwnPropertyNames(proto)
      .filter((m) => m !== 'constructor')
      .map((m) => proto[m])
      .filter(
        (handler) => Reflect.getMetadata(PATH_METADATA, handler) !== undefined,
      )
      .map((handler) => {
        const path = Reflect.getMetadata(PATH_METADATA, handler) as string;
        const method =
          RequestMethod[
            Reflect.getMetadata(METHOD_METADATA, handler) as number
          ];
        return {
          nome: `${method} /${base}${path === '/' ? '' : `/${path}`}`,
          publica: meta<boolean>(IS_PUBLIC_KEY, handler, controller) === true,
          cargos: meta<string[]>(ROLES_KEY, handler, controller),
          financeiro:
            meta<boolean>(ACESSO_FINANCEIRO_KEY, handler, controller) === true,
          reautenticacao:
            meta<boolean>(REAUTENTICACAO_KEY, handler, controller) === true,
          inativacaoRestrita:
            meta<boolean>(INATIVACAO_RESTRITA_KEY, handler, controller) ===
            true,
        };
      });
  });
}

const rota = (nome: string) => {
  const encontrada = rotas().find((r) => r.nome === nome);
  if (!encontrada) throw new Error(`Rota não encontrada: ${nome}`);
  return encontrada;
};

describe('matriz de acesso das rotas', () => {
  it('encontra as rotas dos controllers', () => {
    expect(rotas().length).toBeGreaterThan(50);
  });

  it('toda rota declara quem pode acessá-la (nega por padrão)', () => {
    const semRegra = rotas()
      .filter((r) => !r.publica && !r.cargos?.length && !r.financeiro)
      .map((r) => r.nome);
    expect(semRegra).toEqual([]);
  });

  it('só login, refresh, logout e health são públicas', () => {
    expect(
      rotas()
        .filter((r) => r.publica)
        .map((r) => r.nome)
        .sort(),
    ).toEqual(
      [
        'GET /health',
        'GET /health/ready',
        'POST /auth/login',
        'POST /auth/recuperar',
        'POST /auth/logout',
        'POST /auth/refresh',
      ].sort(),
    );
  });

  it('todo o financeiro exige permissão financeira', () => {
    const financeiro = rotas().filter((r) => r.nome.includes(' /financeiro'));
    expect(financeiro.length).toBeGreaterThan(0);
    expect(financeiro.filter((r) => !r.financeiro)).toEqual([]);
  });

  it.each([
    'PATCH /financeiro/despesas/:id/pagar',
    'PATCH /financeiro/receitas/:id/receber',
    'PATCH /compras/:id/pagar',
    'PATCH /compras/:id/estornar-pagamento',
    'PATCH /compras/:id/cancelar',
  ])('%s exige permissão financeira e reautenticação', (nome) => {
    expect(rota(nome)).toMatchObject({
      financeiro: true,
      reautenticacao: true,
    });
  });

  it('gestão de usuários é do administrador e altera acessos com reautenticação', () => {
    for (const nome of [
      'GET /usuarios',
      'POST /usuarios',
      'PATCH /usuarios/:id/acesso',
    ]) {
      expect(rota(nome).cargos).toEqual(['ADMINISTRADOR']);
    }
    expect(rota('POST /usuarios').reautenticacao).toBe(true);
    expect(rota('PATCH /usuarios/:id/acesso').reautenticacao).toBe(true);
  });

  it('estorno de recebimento é da gestão', () => {
    expect(rota('PATCH /compras/:id/desconfirmar').cargos).toEqual([
      'ADMINISTRADOR',
      'GERENTE',
    ]);
  });

  it.each([
    'categorias',
    'clientes',
    'fornecedores',
    'produtos',
    'projetos',
    'veiculos',
  ])(
    'edição de %s restringe o campo ativo e o DELETE é da gestão',
    (recurso) => {
      expect(rota(`PATCH /${recurso}/:id`).inativacaoRestrita).toBe(true);
      expect(rota(`DELETE /${recurso}/:id`).cargos).toEqual([
        'ADMINISTRADOR',
        'GERENTE',
      ]);
    },
  );
});
