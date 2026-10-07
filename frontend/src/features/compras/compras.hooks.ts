import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelarCompra,
  confirmarCompra,
  createCompra,
  desconfirmarCompra,
  estornarPagamentoCompra,
  getCompra,
  listCompras,
  pagarCompra,
} from './compras.api';
import type { CompraFormValues, CompraQuery } from './compras.types';

const KEY = ['compras'];

function invalidateCompras(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: KEY });
  qc.invalidateQueries({ queryKey: ['dashboard'] });
}

export function useCompras(params: CompraQuery) {
  return useQuery({
    queryKey: [...KEY, params],
    queryFn: () => listCompras(params),
    placeholderData: (prev) => prev,
  });
}

export function useCompra(id: number | null) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => getCompra(id!),
    enabled: id != null,
  });
}

export function useCreateCompra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: CompraFormValues) => createCompra(values),
    onSuccess: () => invalidateCompras(qc),
  });
}

export function usePagarCompra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dataPagamento }: { id: number; dataPagamento?: string }) =>
      pagarCompra(id, dataPagamento),
    onSuccess: () => {
      invalidateCompras(qc);
      qc.invalidateQueries({ queryKey: ['financeiro'] });
    },
  });
}

export function useConfirmarCompra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => confirmarCompra(id),
    onSuccess: () => {
      invalidateCompras(qc);
      qc.invalidateQueries({ queryKey: ['produtos'] });
      qc.invalidateQueries({ queryKey: ['movimentacoes'] });
    },
  });
}

export function useDesconfirmarCompra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => desconfirmarCompra(id),
    onSuccess: () => {
      invalidateCompras(qc);
      qc.invalidateQueries({ queryKey: ['produtos'] });
      qc.invalidateQueries({ queryKey: ['movimentacoes'] });
    },
  });
}

export function useEstornarPagamentoCompra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => estornarPagamentoCompra(id),
    onSuccess: () => {
      invalidateCompras(qc);
      qc.invalidateQueries({ queryKey: ['financeiro'] });
    },
  });
}

export function useCancelarCompra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => cancelarCompra(id),
    onSuccess: () => {
      invalidateCompras(qc);
      qc.invalidateQueries({ queryKey: ['financeiro'] });
    },
  });
}
