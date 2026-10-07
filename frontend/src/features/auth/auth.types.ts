export type Cargo = 'ADMINISTRADOR' | 'GERENTE' | 'OPERADOR';

export interface AuthUser {
  id: number;
  nome: string;
  email: string;
  cargo: Cargo;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}
