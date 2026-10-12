import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ACESSO_FINANCEIRO_KEY } from '../decorators/permissoes.decorator';
import type { Cargo } from '../../../generated/prisma/client';
import type { AuthenticatedUser } from '../types/authenticated-user';

/**
 * Guard de RBAC. Lê os cargos exigidos via @Roles e compara com o cargo do
 * usuário autenticado. Deve rodar depois do JwtAuthGuard.
 *
 * Nega por padrão: toda rota precisa declarar quem pode acessá-la (@Public,
 * @Roles ou @AcessoFinanceiro). Esquecer a regra fecha a rota em vez de abri-la.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<Cargo[]>(
      ROLES_KEY,
      targets,
    );
    const financeiro = this.reflector.getAllAndOverride<boolean>(
      ACESSO_FINANCEIRO_KEY,
      targets,
    );
    if (!requiredRoles?.length) {
      // A regra financeira é aplicada pelo PermissoesGuard.
      if (financeiro) return true;
      throw new ForbiddenException('Rota sem regra de acesso declarada.');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user || !requiredRoles.includes(user.cargo)) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar este recurso.',
      );
    }
    return true;
  }
}
