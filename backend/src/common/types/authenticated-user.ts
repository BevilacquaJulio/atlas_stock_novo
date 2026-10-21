import type { Cargo } from '../../../generated/prisma/client';

/** Payload do access token / usuário anexado à request após o JwtAuthGuard. */
export interface AuthenticatedUser {
  sessaoId?: string;
  id: number;
  nome: string;
  email: string;
  cargo: Cargo;
  /** Permissão financeira efetiva, calculada no servidor (temAcessoFinanceiro). */
  acessoFinanceiro: boolean;
}
