import { api } from '../../lib/api';
import type { Paginated } from '../../lib/types';
import type { Compra, CompraFormValues, CompraQuery } from './compras.types';

export async function listCompras(
  params: CompraQuery,
): Promise<Paginated<Compra>> {
  const { data } = await api.get<Paginated<Compra>>('/compras', { params });
  return data;
}

export async function getCompra(id: number): Promise<Compra> {
  const { data } = await api.get<Compra>(`/compras/${id}`);
  return data;
}

export async function createCompra(values: CompraFormValues): Promise<Compra> {
  const { data } = await api.post<Compra>('/compras', values);
  return data;
}

export async function pagarCompra(
  id: number,
  dataPagamento?: string,
): Promise<Compra> {
  const { data } = await api.patch<Compra>(`/compras/${id}/pagar`, {
    ...(dataPagamento ? { dataPagamento } : {}),
  });
  return data;
}

export async function confirmarCompra(id: number): Promise<Compra> {
  const { data } = await api.patch<Compra>(`/compras/${id}/confirmar`);
  return data;
}

export async function cancelarCompra(id: number): Promise<Compra> {
  const { data } = await api.patch<Compra>(`/compras/${id}/cancelar`);
  return data;
}

export async function desconfirmarCompra(id: number): Promise<Compra> {
  const { data } = await api.patch<Compra>(`/compras/${id}/desconfirmar`);
  return data;
}

export async function estornarPagamentoCompra(id: number): Promise<Compra> {
  const { data } = await api.patch<Compra>(`/compras/${id}/estornar-pagamento`);
  return data;
}
