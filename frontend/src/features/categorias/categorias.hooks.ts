import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { PaginationParams } from '../../lib/types';
import {
  createCategoria,
  deleteCategoria,
  listCategorias,
  updateCategoria,
} from './categorias.api';
import type { CategoriaFormValues } from './categorias.types';

const KEY = ['categorias'];

export function useCategorias(params: PaginationParams) {
  return useQuery({
    queryKey: [...KEY, params],
    queryFn: () => listCategorias(params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: CategoriaFormValues) => createCategoria(values),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; values: CategoriaFormValues }) =>
      updateCategoria(input.id, input.values),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteCategoria(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
