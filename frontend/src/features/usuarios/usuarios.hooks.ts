import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  createUsuario,
  listUsuarios,
  updateAcessoUsuario,
} from './usuarios.api';
import type { AcessoUsuarioValues, NovoUsuarioValues } from './usuarios.types';

const KEY = ['usuarios'];

export function useUsuarios(enabled: boolean, search = '') {
  return useInfiniteQuery({
    queryKey: [...KEY, search],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      listUsuarios({ page: pageParam, limit: 25, search: search || undefined }),
    getNextPageParam: (last, pages) =>
      last.length === 25 ? pages.length + 1 : undefined,
    select: (data) => data.pages.flat(),
    enabled,
  });
}

export function useCreateUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: NovoUsuarioValues) => createUsuario(values),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateAcessoUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; values: AcessoUsuarioValues }) =>
      updateAcessoUsuario(input.id, input.values),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
