import type { Cargo } from '../auth/auth.types';

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  cargo: Cargo;
  ativo: boolean;
  /** Permissão explícita; só tem efeito para gerentes. */
  acessoFinanceiro: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NovoUsuarioValues {
  nome: string;
  email: string;
  senha: string;
  cargo: Cargo;
  acessoFinanceiro: boolean;
}

export interface AcessoUsuarioValues {
  cargo: Cargo;
  ativo: boolean;
  acessoFinanceiro: boolean;
}

export const CARGO_LABEL: Record<Cargo, string> = {
  ADMINISTRADOR: 'Administrador',
  GERENTE: 'Gerente',
  OPERADOR: 'Operador',
};
