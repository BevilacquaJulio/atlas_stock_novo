import { api } from '../../lib/api';
import type { Paginated, PaginationParams } from '../../lib/types';
import type { Categoria, CategoriaFormValues } from './categorias.types';

export async function listCategorias(
  params: PaginationParams,
): Promise<Paginated<Categoria>> {
  const { data } = await api.get<Paginated<Categoria>>('/categorias', {
    params,
  });
  return data;
}

export async function createCategoria(
  values: CategoriaFormValues,
): Promise<Categoria> {
  const { data } = await api.post<Categoria>('/categorias', values);
  return data;
}

export async function updateCategoria(
  id: number,
  values: CategoriaFormValues,
): Promise<Categoria> {
  const { data } = await api.patch<Categoria>(`/categorias/${id}`, values);
  return data;
}

export async function deleteCategoria(id: number): Promise<void> {
  await api.delete(`/categorias/${id}`);
}
