import type { Cargo } from '../../../generated/prisma/client';

/**
 * Matriz de acesso (decidida em 12/10/2026):
 * - ADMINISTRADOR: tudo, inclusive financeiro e gestão de usuários.
 * - GERENTE: operação e inativação; financeiro só com permissão explícita.
 * - OPERADOR: operação do dia a dia; nunca financeiro nem inativação.
 * Ações financeiras críticas e gestão de acessos exigem também a
 * reautenticação do próprio usuário (ver PermissoesGuard).
 */
export const TODOS_OS_CARGOS: Cargo[] = [
  'ADMINISTRADOR',
  'GERENTE',
  'OPERADOR',
];
export const CARGOS_GESTAO: Cargo[] = ['ADMINISTRADOR', 'GERENTE'];

/** Regra única do acesso financeiro, aplicada no servidor. */
export function temAcessoFinanceiro(usuario: {
  cargo: Cargo;
  acessoFinanceiro: boolean;
}): boolean {
  return (
    usuario.cargo === 'ADMINISTRADOR' ||
    (usuario.cargo === 'GERENTE' && usuario.acessoFinanceiro)
  );
}
