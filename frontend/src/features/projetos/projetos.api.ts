import { api } from '../../lib/api';
import type { Paginated } from '../../lib/types';
import type {
  AlterarStatusValues,
  ChecklistItemFormValues,
  ConsumoFormValues,
  Projeto,
  ProjetoFormValues,
  ProjetoQuery,
} from './projetos.types';

export async function listProjetos(
  params: ProjetoQuery,
): Promise<Paginated<Projeto>> {
  const { data } = await api.get<Paginated<Projeto>>('/projetos', { params });
  return data;
}

export async function getProjeto(id: number): Promise<Projeto> {
  const { data } = await api.get<Projeto>(`/projetos/${id}`);
  return data;
}

export async function createProjeto(values: ProjetoFormValues): Promise<Projeto> {
  const { data } = await api.post<Projeto>('/projetos', values);
  return data;
}

export async function alterarStatusProjeto(
  id: number,
  values: AlterarStatusValues,
): Promise<Projeto> {
  const { data } = await api.patch<Projeto>(`/projetos/${id}/status`, values);
  return data;
}

export async function addChecklistItem(
  projetoId: number,
  values: ChecklistItemFormValues,
) {
  const { data } = await api.post(
    `/projetos/${projetoId}/checklist`,
    values,
  );
  return data;
}

export async function updateChecklistItem(
  projetoId: number,
  itemId: number,
  values: { concluido?: boolean; descricao?: string },
) {
  const { data } = await api.patch(
    `/projetos/${projetoId}/checklist/${itemId}`,
    values,
  );
  return data;
}

export async function deleteChecklistItem(projetoId: number, itemId: number) {
  await api.delete(`/projetos/${projetoId}/checklist/${itemId}`);
}

export async function registrarConsumo(
  projetoId: number,
  values: ConsumoFormValues,
) {
  const { data } = await api.post(`/projetos/${projetoId}/consumos`, values);
  return data;
}
