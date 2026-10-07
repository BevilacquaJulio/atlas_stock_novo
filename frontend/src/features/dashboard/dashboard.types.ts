export interface DashboardContagens {
  clientes: number;
  produtos: number;
  projetosAtivos: number;
  projetosEmAndamento: number;
  comprasAPagar: number;
  despesasAPagar: { quantidade: number; total: string | number };
  receitasAReceber: { quantidade: number; total: string | number };
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
