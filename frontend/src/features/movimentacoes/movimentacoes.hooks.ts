import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  createMovimentacao,
  listMovimentacoes,
} from './movimentacoes.api';
import type {
  MovimentacaoFormValues,
  MovimentacaoQuery,
} from './movimentacoes.types';

const KEY = ['movimentacoes'];

export function useMovimentacoes(params: MovimentacaoQuery) {
  return useQuery({
    queryKey: [...KEY, params],
    queryFn: () => listMovimentacoes(params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateMovimentacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: MovimentacaoFormValues) => createMovimentacao(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      // O estoque do produto muda — revalida produtos também.
      qc.invalidateQueries({ queryKey: ['produtos'] });
    },
  });
}
