import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { PaginationParams } from '../../lib/types';
import {
  createProduto,
  deleteProduto,
  listProdutos,
  updateProduto,
} from './produtos.api';
import type { ProdutoFormValues, ProdutoUpdateValues } from './produtos.types';

const KEY = ['produtos'];

export function useProdutos(params: PaginationParams) {
  return useQuery({
    queryKey: [...KEY, params],
    queryFn: () => listProdutos(params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: ProdutoFormValues) => createProduto(values),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; values: ProdutoUpdateValues }) =>
      updateProduto(input.id, input.values),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteProduto(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
