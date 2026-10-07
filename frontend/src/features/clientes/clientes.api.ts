import { api } from '../../lib/api';
import type { Paginated, PaginationParams } from '../../lib/types';
import type { Cliente, ClienteFormValues } from './clientes.types';

export async function listClientes(
  params: PaginationParams,
): Promise<Paginated<Cliente>> {
  const { data } = await api.get<Paginated<Cliente>>('/clientes', { params });
  return data;
}

export async function createCliente(
  values: ClienteFormValues,
): Promise<Cliente> {
  const { data } = await api.post<Cliente>('/clientes', values);
  return data;
}

export async function updateCliente(
  id: number,
  values: ClienteFormValues,
): Promise<Cliente> {
  const { data } = await api.patch<Cliente>(`/clientes/${id}`, values);
  return data;
}

export async function deleteCliente(id: number): Promise<void> {
  await api.delete(`/clientes/${id}`);
}
