import type { Cargo } from '../../../generated/prisma/client';

/** Payload do access token / usuário anexado à request após o JwtAuthGuard. */
export interface AuthenticatedUser {
  id: number;
  nome: string;
  email: string;
  cargo: Cargo;
}

/** Claims do JWT (access token). */
export interface JwtAccessPayload {
  sub: number;
  email: string;
  cargo: Cargo;
  nome: string;
}

/** Claims do JWT (refresh token). */
export interface JwtRefreshPayload {
  sub: number;
  tokenId: number;
}
