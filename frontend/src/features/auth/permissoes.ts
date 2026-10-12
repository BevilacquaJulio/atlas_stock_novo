import { useAuth } from './useAuth';

/**
 * Permissões do usuário logado para montar a interface. É só conveniência:
 * a autorização de verdade acontece na API, que recusa o que não for permitido.
 */
export function usePermissoes() {
  const { user } = useAuth();
  return {
    financeiro: user?.acessoFinanceiro === true,
    gestao: user?.cargo === 'ADMINISTRADOR' || user?.cargo === 'GERENTE',
    administrador: user?.cargo === 'ADMINISTRADOR',
  };
}

/**
 * Remove o campo `ativo` do envio de quem não é da gestão: a API só aceita
 * ativar/inativar de administradores e gerentes, e um `ativo` enviado sem
 * mudança faria a edição comum do operador ser recusada.
 */
export function semCampoAtivo<T extends { ativo?: boolean }>(
  values: T,
): Omit<T, 'ativo'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { ativo, ...resto } = values;
  return resto;
}
