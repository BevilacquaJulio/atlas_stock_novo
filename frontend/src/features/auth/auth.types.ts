export type Cargo = 'ADMINISTRADOR' | 'GERENTE' | 'OPERADOR';

export interface AuthUser {
  sessaoId?: string;
  id: number;
  nome: string;
  email: string;
  cargo: Cargo;
  /** Permissão financeira efetiva, calculada pela API. */
  acessoFinanceiro: boolean;
}

export interface LoginResponse {
  accessToken: string;

  user: AuthUser;
}
