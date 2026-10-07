export type MovimentacaoTipo = 'ENTRADA' | 'SAIDA';

export interface Movimentacao {
  id: number;
  produtoId: number;
  tipo: MovimentacaoTipo;
  quantidade: string;
  custoUnitario: string;
  valorTotal: string;
  motivo: string | null;
  projetoId: number | null;
  usuarioId: number;
  dataMovimentacao: string;
  produto?: { id: number; codigo: string; nome: string };
  usuario?: { id: number; nome: string };
}

export interface MovimentacaoFormValues {
  produtoId: number;
  tipo: MovimentacaoTipo;
  quantidade: number;
  custoUnitario?: number;
  motivo?: string | null;
}

export interface MovimentacaoQuery {
  page?: number;
  limit?: number;
  produtoId?: number;
  tipo?: MovimentacaoTipo;
}
