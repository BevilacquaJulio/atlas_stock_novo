import { api } from '../../lib/api';
import type { Paginated } from '../../lib/types';
import type {
  CategoriaDespesa,
  Despesa,
  DespesaFormValues,
  FinanceiroQuery,
  FinanceiroResumo,
  FinanceiroStatus,
  Receita,
  ReceitaFormValues,
} from './financeiro.types';

export async function getFinanceiroStatus(): Promise<FinanceiroStatus> {
  const { data } = await api.get<FinanceiroStatus>('/financeiro/status');
  return data;
}

export async function desbloquearFinanceiro(
  senha: string,
): Promise<{ token: string | null; expiresIn: string | null }> {
  const { data } = await api.post<{ token: string | null; expiresIn: string | null }>(
    '/financeiro/desbloquear',
    { senha },
  );
  return data;
}

export async function getFinanceiroResumo(): Promise<FinanceiroResumo> {
  const { data } = await api.get<FinanceiroResumo>('/financeiro/resumo');
  return data;
}

export async function listDespesas(
  params: FinanceiroQuery,
): Promise<Paginated<Despesa>> {
  const { data } = await api.get<Paginated<Despesa>>('/financeiro/despesas', {
    params,
  });
  return data;
}

export async function createDespesa(values: DespesaFormValues): Promise<Despesa> {
  const { data } = await api.post<Despesa>('/financeiro/despesas', values);
  return data;
}

export async function pagarDespesa(id: number): Promise<Despesa> {
  const { data } = await api.patch<Despesa>(`/financeiro/despesas/${id}/pagar`, {});
  return data;
}

export async function listReceitas(
  params: FinanceiroQuery,
): Promise<Paginated<Receita>> {
  const { data } = await api.get<Paginated<Receita>>('/financeiro/receitas', {
    params,
  });
  return data;
}

export async function createReceita(values: ReceitaFormValues): Promise<Receita> {
  const { data } = await api.post<Receita>('/financeiro/receitas', values);
  return data;
}

export async function receberReceita(id: number): Promise<Receita> {
  const { data } = await api.patch<Receita>(`/financeiro/receitas/${id}/receber`, {});
  return data;
}

export async function listCategoriasDespesa(): Promise<CategoriaDespesa[]> {
  const { data } = await api.get<CategoriaDespesa[]>(
    '/financeiro/categorias-despesa',
  );
  return data;
}
