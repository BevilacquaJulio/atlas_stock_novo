import { api } from '../../lib/api';
import type { Paginated, PaginationParams } from '../../lib/types';
import type {
  Produto,
  ProdutoFormValues,
  ProdutoUpdateValues,
} from './produtos.types';

export async function listProdutos(
  params: PaginationParams,
): Promise<Paginated<Produto>> {
  const { data } = await api.get<Paginated<Produto>>('/produtos', { params });
  return data;
}

export async function createProduto(
  values: ProdutoFormValues,
): Promise<Produto> {
  const { data } = await api.post<Produto>('/produtos', values);
  return data;
}

export async function updateProduto(
  id: number,
  values: ProdutoUpdateValues,
): Promise<Produto> {
  const { data } = await api.patch<Produto>(`/produtos/${id}`, values);
  return data;
}

export async function deleteProduto(id: number): Promise<void> {
  await api.delete(`/produtos/${id}`);
}
