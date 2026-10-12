import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createUsuario,
  listUsuarios,
  updateAcessoUsuario,
} from './usuarios.api';
import type { AcessoUsuarioValues, NovoUsuarioValues } from './usuarios.types';

const KEY = ['usuarios'];

export function useUsuarios(enabled: boolean) {
  return useQuery({ queryKey: KEY, queryFn: listUsuarios, enabled });
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
