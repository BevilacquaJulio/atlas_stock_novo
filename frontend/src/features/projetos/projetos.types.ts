export type ProjetoStatus =
  | 'AGUARDANDO'
  | 'EM_ANDAMENTO'
  | 'CONCLUIDO'
  | 'CANCELADO';

export type ProjetoConsumoTipo = 'PRODUTO' | 'SERVICO';

export interface ProjetoChecklistItem {
  id: number;
  projetoId: number;
  descricao: string;
  concluido: boolean;
  ordem: number;
  concluidoEm: string | null;
}

export interface ProjetoHistorico {
  id: number;
  statusAnterior: ProjetoStatus | null;
  statusNovo: ProjetoStatus;
  observacao: string | null;
  createdAt: string;
  usuario?: { id: number; nome: string };
}

export interface ProjetoConsumo {
  id: number;
  tipo: ProjetoConsumoTipo;
  produtoId: number | null;
  descricao: string | null;
  quantidade: string;
  valorUnitario: string;
  valorTotal: string;
  createdAt: string;
  produto?: { id: number; codigo: string; nome: string } | null;
  usuario?: { id: number; nome: string };
}

export interface Projeto {
  id: number;
  clienteId: number;
  veiculoId: number;
  status: ProjetoStatus;
  descricao: string | null;
  valorOrcado: string;
  valorFinal: string | null;
  dataInicio: string | null;
  dataConclusao: string | null;
  ativo: boolean;
  createdAt: string;
  cliente?: { id: number; nomeCompleto: string };
  veiculo?: { id: number; placa: string; marca: string; modelo: string };
  usuario?: { id: number; nome: string };
  checklist?: ProjetoChecklistItem[];
  historico?: ProjetoHistorico[];
  consumos?: ProjetoConsumo[];
  _count?: { checklist: number; consumos: number };
}

export interface ProjetoFormValues {
  clienteId: number;
  veiculoId: number;
  descricao?: string;
  valorOrcado: number;
}

export interface ProjetoQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: ProjetoStatus;
  clienteId?: number;
  ativo?: boolean;
}

export interface AlterarStatusValues {
  status: ProjetoStatus;
  observacao?: string;
}

export interface ChecklistItemFormValues {
  descricao: string;
}

export interface ConsumoFormValues {
  tipo: ProjetoConsumoTipo;
  produtoId?: number;
  descricao?: string;
  quantidade: number;
  valorUnitario: number;
}

export const PROJETO_STATUS_LABEL: Record<ProjetoStatus, string> = {
  AGUARDANDO: 'Aguardando',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
};
