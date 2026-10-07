import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { PaginationParams } from '../../lib/types';
import {
  createVeiculo,
  deleteVeiculo,
  listVeiculos,
  updateVeiculo,
} from './veiculos.api';
import type { VeiculoFormValues } from './veiculos.types';

const KEY = ['veiculos'];

export function useVeiculos(params: PaginationParams) {
  return useQuery({
    queryKey: [...KEY, params],
    queryFn: () => listVeiculos(params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateVeiculo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: VeiculoFormValues) => createVeiculo(values),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateVeiculo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; values: VeiculoFormValues }) =>
      updateVeiculo(input.id, input.values),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteVeiculo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteVeiculo(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
