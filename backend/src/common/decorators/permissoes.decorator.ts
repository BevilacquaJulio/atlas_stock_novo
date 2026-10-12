import { SetMetadata } from '@nestjs/common';

export const ACESSO_FINANCEIRO_KEY = 'acessoFinanceiro';
export const REAUTENTICACAO_KEY = 'reautenticacao';
export const INATIVACAO_RESTRITA_KEY = 'inativacaoRestrita';

/**
 * Exige permissão financeira (administrador ou gerente autorizado). Vale como
 * regra de acesso declarada para o RolesGuard.
 */
export const AcessoFinanceiro = () => SetMetadata(ACESSO_FINANCEIRO_KEY, true);

/**
 * Ação crítica: além da permissão, exige que o usuário tenha confirmado a
 * própria senha há pouco (header X-Reautenticacao, via POST /auth/reautenticar).
 */
export const ExigeReautenticacao = () => SetMetadata(REAUTENTICACAO_KEY, true);

/**
 * Edição que aceita o campo `ativo`: só administrador e gerente podem
 * inativar/reativar, o mesmo que já vale para o DELETE.
 */
export const InativacaoRestrita = () =>
  SetMetadata(INATIVACAO_RESTRITA_KEY, true);
