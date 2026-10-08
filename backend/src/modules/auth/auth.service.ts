import { createHash, randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsuariosRepository } from '../usuarios/usuarios.repository';
import { RefreshTokenRepository } from './refresh-token.repository';
import { jwtPolicy, refreshClaimsSchema } from '../../common/auth/jwt-policy';
import type {
  AuthenticatedUser,
  JwtAccessPayload,
  JwtRefreshPayload,
} from '../../common/types/authenticated-user';
import type { Prisma } from '../../../generated/prisma/client';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
export type LoginResult = TokenPair & { user: AuthenticatedUser };
type ExpiresIn = JwtSignOptions['expiresIn'];
const digest = (token: string) =>
  createHash('sha256').update(token).digest('hex');
// Mantém o custo de comparação para e-mails inexistentes ou contas inativas.
const dummyPasswordHash = bcrypt.hashSync(randomUUID(), 10);

@Injectable()
export class AuthService {
  constructor(
    private readonly usuarios: UsuariosRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, senha: string): Promise<LoginResult> {
    const usuario = await this.usuarios.findByEmailWithSenha(email);
    const passwordMatches = await bcrypt.compare(
      senha,
      usuario?.senha ?? dummyPasswordHash,
    );
    if (!usuario?.ativo || !passwordMatches) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }
    return this.refreshTokens.withUserLock(usuario.id, async (tx) => {
      const current = await this.usuarios.findById(usuario.id, tx);
      if (!current?.ativo)
        throw new UnauthorizedException('Credenciais inválidas.');
      const user = this.publicUser(current);
      return { ...(await this.issueTokens(user, tx)), user };
    });
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const payload = await this.verifyRefresh(refreshToken);
    const tokens = await this.refreshTokens.withUserLock(
      payload.sub,
      async (tx) => {
        const stored = await this.refreshTokens.findById(payload.tokenId, tx);
        if (!stored || stored.usuarioId !== payload.sub) return null;
        if (stored.revokedAt || stored.tokenHash !== digest(refreshToken)) {
          // O 401 vem após o commit para preservar a revogação ao detectar reuso.
          await this.refreshTokens.revokeAllForUser(payload.sub, tx);
          return null;
        }
        if (stored.expiresAt <= new Date()) return null;
        const usuario = await this.usuarios.findById(payload.sub, tx);
        if (!usuario?.ativo) {
          await this.refreshTokens.revokeAllForUser(payload.sub, tx);
          return null;
        }
        await this.refreshTokens.revoke(stored.id, tx);
        return this.issueTokens(this.publicUser(usuario), tx);
      },
    );
    if (!tokens)
      throw new UnauthorizedException('Sessão expirada. Faça login novamente.');
    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    let payload: JwtRefreshPayload;
    try {
      payload = await this.verifyRefresh(refreshToken);
    } catch {
      return;
    }
    await this.refreshTokens.withUserLock(payload.sub, async (tx) => {
      const stored = await this.refreshTokens.findById(payload.tokenId, tx);
      if (
        !stored ||
        stored.usuarioId !== payload.sub ||
        stored.tokenHash !== digest(refreshToken)
      )
        return;
      if (stored.revokedAt) {
        await this.refreshTokens.revokeAllForUser(payload.sub, tx);
      } else {
        await this.refreshTokens.revoke(stored.id, tx);
      }
    });
  }

  private async verifyRefresh(token: string): Promise<JwtRefreshPayload> {
    try {
      return refreshClaimsSchema.parse(
        await this.jwt.verifyAsync(token, {
          ...jwtPolicy,
          secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        }),
      );
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado.');
    }
  }

  private publicUser(user: AuthenticatedUser): AuthenticatedUser {
    return {
      id: user.id,
      nome: user.nome,
      email: user.email,
      cargo: user.cargo,
    };
  }

  private async issueTokens(
    user: AuthenticatedUser,
    tx: Prisma.TransactionClient,
  ): Promise<TokenPair> {
    const accessPayload: JwtAccessPayload = {
      purpose: 'access',
      sub: user.id,
      email: user.email,
      cargo: user.cargo,
      nome: user.nome,
    };
    const options = {
      issuer: jwtPolicy.issuer,
      audience: jwtPolicy.audience,
      algorithm: 'HS256' as const,
    };
    const accessToken = await this.jwt.signAsync(accessPayload, {
      ...options,
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>(
        'JWT_ACCESS_EXPIRES_IN',
        '15m',
      ) as ExpiresIn,
      jwtid: randomUUID(),
    });
    const refreshTtl = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const expiresAt = new Date(Date.now() + parseDurationMs(refreshTtl));
    const row = await this.refreshTokens.createEmpty(user.id, expiresAt, tx);
    const refreshPayload: JwtRefreshPayload = {
      purpose: 'refresh',
      sub: user.id,
      tokenId: row.id,
    };
    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      ...options,
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: refreshTtl as ExpiresIn,
      jwtid: randomUUID(),
    });
    await this.refreshTokens.setHash(row.id, digest(refreshToken), tx);
    return { accessToken, refreshToken };
  }
}

export function parseDurationMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) throw new Error('Duração de token inválida.');
  const factor: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return Number(match[1]) * factor[match[2]];
}
