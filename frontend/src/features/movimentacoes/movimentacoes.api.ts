import { api } from '../../lib/api';
import type { Paginated } from '../../lib/types';
import type {
  Movimentacao,
  MovimentacaoFormValues,
  MovimentacaoQuery,
} from './movimentacoes.types';

export async function listMovimentacoes(
  params: MovimentacaoQuery,
): Promise<Paginated<Movimentacao>> {
  const { data } = await api.get<Paginated<Movimentacao>>('/movimentacoes', {
    params,
  });
  return data;
}

export async function createMovimentacao(
  values: MovimentacaoFormValues,
): Promise<Movimentacao> {
  const { data } = await api.post<Movimentacao>('/movimentacoes', values);
  return data;
}
