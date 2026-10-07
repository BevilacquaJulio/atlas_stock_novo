import { api } from '../../lib/api';
import type { Paginated, PaginationParams } from '../../lib/types';
import type { Veiculo, VeiculoFormValues } from './veiculos.types';

export async function listVeiculos(
  params: PaginationParams,
): Promise<Paginated<Veiculo>> {
  const { data } = await api.get<Paginated<Veiculo>>('/veiculos', { params });
  return data;
}

export async function createVeiculo(
  values: VeiculoFormValues,
): Promise<Veiculo> {
  const { data } = await api.post<Veiculo>('/veiculos', values);
  return data;
}

export async function updateVeiculo(
  id: number,
  values: VeiculoFormValues,
): Promise<Veiculo> {
  const { data } = await api.patch<Veiculo>(`/veiculos/${id}`, values);
  return data;
}

export async function deleteVeiculo(id: number): Promise<void> {
  await api.delete(`/veiculos/${id}`);
}
