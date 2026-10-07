import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDespesa,
  createReceita,
  desbloquearFinanceiro,
  getFinanceiroResumo,
  getFinanceiroStatus,
  listCategoriasDespesa,
  listDespesas,
  listReceitas,
  pagarDespesa,
  receberReceita,
} from './financeiro.api';
import { financeiroUnlockStore } from '../../lib/financeiro-unlock';
import type {
  DespesaFormValues,
  FinanceiroQuery,
  ReceitaFormValues,
} from './financeiro.types';

const STATUS_KEY = ['financeiro', 'status'];
const RESUMO_KEY = ['financeiro', 'resumo'];
const DESPESAS_KEY = ['financeiro', 'despesas'];
const RECEITAS_KEY = ['financeiro', 'receitas'];

export function useFinanceiroStatus() {
  return useQuery({
    queryKey: STATUS_KEY,
    queryFn: getFinanceiroStatus,
  });
}

export function useDesbloquearFinanceiro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (senha: string) => desbloquearFinanceiro(senha),
    onSuccess: (data) => {
      if (data.token) financeiroUnlockStore.set(data.token);
      qc.invalidateQueries({ queryKey: ['financeiro'] });
    },
  });
}

export function useFinanceiroResumo(enabled: boolean) {
  return useQuery({
    queryKey: RESUMO_KEY,
    queryFn: getFinanceiroResumo,
    enabled,
  });
}

export function useDespesas(params: FinanceiroQuery, enabled: boolean) {
  return useQuery({
    queryKey: [...DESPESAS_KEY, params],
    queryFn: () => listDespesas(params),
    enabled,
    placeholderData: (prev) => prev,
  });
}

export function useReceitas(params: FinanceiroQuery, enabled: boolean) {
  return useQuery({
    queryKey: [...RECEITAS_KEY, params],
    queryFn: () => listReceitas(params),
    enabled,
    placeholderData: (prev) => prev,
  });
}

export function useCategoriasDespesa(enabled: boolean) {
  return useQuery({
    queryKey: ['financeiro', 'categorias'],
    queryFn: listCategoriasDespesa,
    enabled,
  });
}

export function useCreateDespesa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: DespesaFormValues) => createDespesa(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DESPESAS_KEY });
      qc.invalidateQueries({ queryKey: RESUMO_KEY });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function usePagarDespesa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => pagarDespesa(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DESPESAS_KEY });
      qc.invalidateQueries({ queryKey: RESUMO_KEY });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCreateReceita() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: ReceitaFormValues) => createReceita(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RECEITAS_KEY });
      qc.invalidateQueries({ queryKey: RESUMO_KEY });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useReceberReceita() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => receberReceita(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RECEITAS_KEY });
      qc.invalidateQueries({ queryKey: RESUMO_KEY });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
