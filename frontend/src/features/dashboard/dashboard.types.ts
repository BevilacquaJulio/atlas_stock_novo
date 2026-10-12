export interface DashboardContagens {
  clientes: number;
  produtos: number;
  projetosAtivos: number;
  projetosEmAndamento: number;
  comprasAPagar: number;
  /** `null` para quem não tem acesso financeiro (a API nem consulta). */
  despesasAPagar: { quantidade: number; total: string | number } | null;
  receitasAReceber: { quantidade: number; total: string | number } | null;
  produtosEstoqueBaixo: Array<{
    id: number;
    codigo: string;
    nome: string;
    quantidadeEstoque: string;
    unidadeMedida: string;
  }>;
}

export interface DashboardAlerta {
  tipo: string;
  mensagem: string;
  severidade: 'info' | 'warning';
}

export interface DashboardOverview {
  contagens: DashboardContagens;
  projetosRecentes: Array<{
    id: number;
    status: string;
    cliente?: { nomeCompleto: string };
    veiculo?: { placa: string };
  }>;
  alertas: DashboardAlerta[];
}
