import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UsuariosRepository } from '../../modules/usuarios/usuarios.repository';
import { accessClaimsSchema, jwtPolicy } from '../auth/jwt-policy';
import type {
  AuthenticatedUser,
} from '../types/authenticated-user';

/**
 * Guard global de autenticação. Valida o Bearer access token e anexa o
 * usuário à request. Rotas com @Public() são liberadas.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
    private readonly usuarios: UsuariosRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Token de acesso ausente.');
    }

    let user: AuthenticatedUser;
    try {
      const payload = accessClaimsSchema.parse(await this.jwtService.verifyAsync(
        token,
        { ...jwtPolicy, secret: this.config.get<string>('JWT_ACCESS_SECRET') },
      ));
      const usuario = await this.usuarios.findById(payload.sub);
      if (!usuario?.ativo) throw new UnauthorizedException();
      user = {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        cargo: usuario.cargo,
      };
    } catch {
      throw new UnauthorizedException('Token de acesso inválido ou expirado.');
    }
    request.user = user;
    return true;
  }

  private extractToken(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (!header) return undefined;
    const [type, token] = header.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
