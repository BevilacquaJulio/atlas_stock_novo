import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { PaginationParams } from '../../lib/types';
import {
  createCliente,
  deleteCliente,
  listClientes,
  updateCliente,
} from './clientes.api';
import type { ClienteFormValues } from './clientes.types';

const KEY = ['clientes'];

export function useClientes(params: PaginationParams) {
  return useQuery({
    queryKey: [...KEY, params],
    queryFn: () => listClientes(params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: ClienteFormValues) => createCliente(values),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; values: ClienteFormValues }) =>
      updateCliente(input.id, input.values),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteCliente(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
