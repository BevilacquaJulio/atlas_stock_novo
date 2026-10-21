import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import {
  ACESSO_FINANCEIRO_KEY,
  INATIVACAO_RESTRITA_KEY,
  REAUTENTICACAO_KEY,
} from '../decorators/permissoes.decorator';
import { CARGOS_GESTAO } from '../auth/permissoes';
import { jwtPolicy, reautenticacaoClaimsSchema } from '../auth/jwt-policy';
import type { AuthenticatedUser } from '../types/authenticated-user';

/** Header em que o frontend envia o token de reautenticação. */
export const REAUTENTICACAO_HEADER = 'x-reautenticacao';

/**
 * Permissões além do cargo: acesso financeiro, reautenticação em ações
 * críticas e inativação pela edição. Roda depois do JwtAuthGuard e do
 * RolesGuard; nada aqui confia em dados de permissão enviados pelo cliente.
 */
@Injectable()
export class PermissoesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    if (
      this.marcado(context, ACESSO_FINANCEIRO_KEY) &&
      !user?.acessoFinanceiro
    ) {
      throw new ForbiddenException({
        code: 'ACESSO_FINANCEIRO_NEGADO',
        message: 'Você não tem permissão para acessar o financeiro.',
      });
    }

    if (
      this.marcado(context, INATIVACAO_RESTRITA_KEY) &&
      (request.body as Record<string, unknown> | undefined)?.ativo !==
        undefined &&
      !(user && CARGOS_GESTAO.includes(user.cargo))
    ) {
      throw new ForbiddenException(
        'Somente administradores e gerentes podem ativar ou inativar registros.',
      );
    }

    if (this.marcado(context, REAUTENTICACAO_KEY)) {
      await this.exigirReautenticacao(request, user);
    }
    return true;
  }

  private marcado(context: ExecutionContext, key: string): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(key, [
        context.getHandler(),
        context.getClass(),
      ]) === true
    );
  }

  private async exigirReautenticacao(
    request: Request,
    user: AuthenticatedUser | undefined,
  ): Promise<void> {
    const token = request.headers[REAUTENTICACAO_HEADER];
    const negar = () =>
      new ForbiddenException({
        code: 'REAUTENTICACAO_NECESSARIA',
        message: 'Confirme sua senha para concluir esta ação.',
      });
    if (!user || typeof token !== 'string' || !token) throw negar();

    try {
      const claims = reautenticacaoClaimsSchema.parse(
        await this.jwtService.verifyAsync(token, {
          ...jwtPolicy,
          secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        }),
      );
      if (claims.sub !== user.id || claims.sid !== user.sessaoId) throw negar();
    } catch {
      throw negar();
    }
  }
}
