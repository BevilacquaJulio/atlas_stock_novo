export type CompraStatus = 'A_PAGAR' | 'CONFIRMADA' | 'PAGO' | 'CANCELADA';

export const COMPRA_STATUS_LABEL: Record<CompraStatus, string> = {
  A_PAGAR: 'A pagar',
  PAGO: 'Paga',
  CONFIRMADA: 'Confirmada',
  CANCELADA: 'Cancelada',
};

export interface CompraItem {
  id: number;
  produtoId: number;
  quantidade: string;
  valorUnitario: string;
  valorTotal: string;
  produto?: {
    id: number;
    codigo: string;
    nome: string;
    unidadeMedida: string;
  };
}

export interface Compra {
  id: number;
  fornecedorId: number;
  status: CompraStatus;
  dataCompra: string;
  dataPagamento: string | null;
  valorTotal: string;
  observacoes: string | null;
  usuarioId: number;
  fornecedor?: { id: number; nomeRazaoSocial: string };
  usuario?: { id: number; nome: string };
  itens?: CompraItem[];
  despesa?: { id: number; status: string; valor: string } | null;
  _count?: { itens: number };
}

export interface CompraItemFormValues {
  produtoId: number;
  quantidade: number;
  valorUnitario: number;
}

export interface CompraFormValues {
  fornecedorId: number;
  dataCompra?: string;
  observacoes?: string;
  itens: CompraItemFormValues[];
}

export interface CompraQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: CompraStatus;
  fornecedorId?: number;
}
