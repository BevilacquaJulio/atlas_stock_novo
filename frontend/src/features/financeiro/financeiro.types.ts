export type DespesaStatus = 'A_PAGAR' | 'PAGO';
export type ReceitaStatus = 'A_RECEBER' | 'RECEBIDO';

export interface CategoriaDespesa {
  id: number;
  nome: string;
  ativo: boolean;
}

export interface Despesa {
  id: number;
  descricao: string;
  valor: string;
  status: DespesaStatus;
  dataVencimento: string | null;
  dataPagamento: string | null;
  fornecedorId: number | null;
  categoriaDespesaId: number | null;
  compraId: number | null;
  projetoId: number | null;
  fornecedor?: { id: number; nomeRazaoSocial: string } | null;
  categoriaDespesa?: { id: number; nome: string } | null;
  compra?: { id: number; status: string } | null;
  projeto?: { id: number; status: string } | null;
}

export interface Receita {
  id: number;
  descricao: string;
  valor: string;
  status: ReceitaStatus;
  dataVencimento: string | null;
  dataRecebimento: string | null;
  clienteId: number | null;
  projetoId: number | null;
  cliente?: { id: number; nomeCompleto: string } | null;
  projeto?: {
    id: number;
    status: string;
    veiculo?: { placa: string };
  } | null;
}

export interface DespesaFormValues {
  descricao: string;
  valor: number;
  dataVencimento?: string;
  fornecedorId?: number;
  categoriaDespesaId?: number;
  projetoId?: number;
}

export interface ReceitaFormValues {
  descricao: string;
  valor: number;
  dataVencimento?: string;
  clienteId?: number;
  projetoId?: number;
}

export interface FinanceiroQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface FinanceiroStatus {
  requerDesbloqueio: boolean;
  desbloqueado: boolean;
}

export interface FinanceiroResumo {
  despesasAPagar: { total: string | number; quantidade: number };
  receitasAReceber: { total: string | number; quantidade: number };
}
