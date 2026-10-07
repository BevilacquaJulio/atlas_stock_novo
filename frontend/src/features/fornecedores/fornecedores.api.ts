import { api } from '../../lib/api';
import type { Paginated, PaginationParams } from '../../lib/types';
import type { Fornecedor, FornecedorFormValues } from './fornecedores.types';

export async function listFornecedores(
  params: PaginationParams,
): Promise<Paginated<Fornecedor>> {
  const { data } = await api.get<Paginated<Fornecedor>>('/fornecedores', {
    params,
  });
  return data;
}

export async function createFornecedor(
  values: FornecedorFormValues,
): Promise<Fornecedor> {
  const { data } = await api.post<Fornecedor>('/fornecedores', values);
  return data;
}

export async function updateFornecedor(
  id: number,
  values: FornecedorFormValues,
): Promise<Fornecedor> {
  const { data } = await api.patch<Fornecedor>(`/fornecedores/${id}`, values);
  return data;
}

export async function deleteFornecedor(id: number): Promise<void> {
  await api.delete(`/fornecedores/${id}`);
}
