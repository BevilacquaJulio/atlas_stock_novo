import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { PaginationParams } from '../../lib/types';
import {
  createFornecedor,
  deleteFornecedor,
  listFornecedores,
  updateFornecedor,
} from './fornecedores.api';
import type { FornecedorFormValues } from './fornecedores.types';

const KEY = ['fornecedores'];

export function useFornecedores(params: PaginationParams) {
  return useQuery({
    queryKey: [...KEY, params],
    queryFn: () => listFornecedores(params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateFornecedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: FornecedorFormValues) => createFornecedor(values),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateFornecedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; values: FornecedorFormValues }) =>
      updateFornecedor(input.id, input.values),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteFornecedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteFornecedor(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
