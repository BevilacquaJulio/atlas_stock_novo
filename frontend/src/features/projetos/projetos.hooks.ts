import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addChecklistItem,
  alterarStatusProjeto,
  createProjeto,
  deleteChecklistItem,
  getProjeto,
  listProjetos,
  registrarConsumo,
  updateChecklistItem,
} from './projetos.api';
import type {
  AlterarStatusValues,
  ChecklistItemFormValues,
  ConsumoFormValues,
  ProjetoFormValues,
  ProjetoQuery,
} from './projetos.types';

const KEY = ['projetos'];

export function useProjetos(params: ProjetoQuery) {
  return useQuery({
    queryKey: [...KEY, params],
    queryFn: () => listProjetos(params),
    placeholderData: (prev) => prev,
  });
}

export function useProjeto(id: number) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => getProjeto(id),
    enabled: id > 0,
  });
}

export function useCreateProjeto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: ProjetoFormValues) => createProjeto(values),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useAlterarStatusProjeto(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: AlterarStatusValues) =>
      alterarStatusProjeto(id, values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: [...KEY, id] });
    },
  });
}

export function useAddChecklistItem(projetoId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: ChecklistItemFormValues) =>
      addChecklistItem(projetoId, values),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, projetoId] }),
  });
}

export function useUpdateChecklistItem(projetoId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      values,
    }: {
      itemId: number;
      values: { concluido?: boolean; descricao?: string };
    }) => updateChecklistItem(projetoId, itemId, values),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, projetoId] }),
  });
}

export function useDeleteChecklistItem(projetoId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) => deleteChecklistItem(projetoId, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, projetoId] }),
  });
}

export function useRegistrarConsumo(projetoId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: ConsumoFormValues) =>
      registrarConsumo(projetoId, values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...KEY, projetoId] });
      qc.invalidateQueries({ queryKey: ['produtos'] });
      qc.invalidateQueries({ queryKey: ['movimentacoes'] });
    },
  });
}
