import { Injectable } from '@nestjs/common';
import { DashboardRepository } from './dashboard.repository';

@Injectable()
export class DashboardService {
  constructor(private readonly repo: DashboardRepository) {}

  async getOverview() {
    const [contagens, projetosRecentes] = await Promise.all([
      this.repo.getCounts(),
      this.repo.recentProjetos(),
    ]);

    return {
      contagens,
      projetosRecentes,
      alertas: [
        ...(contagens.comprasAPagar > 0
          ? [
              {
                tipo: 'compras',
                mensagem: `${contagens.comprasAPagar} compra(s) aguardando pagamento`,
                severidade: 'warning' as const,
              },
            ]
          : []),
        ...(contagens.despesasAPagar.quantidade > 0
          ? [
              {
                tipo: 'despesas',
                mensagem: `${contagens.despesasAPagar.quantidade} despesa(s) a pagar`,
                severidade: 'warning' as const,
              },
            ]
          : []),
        ...(contagens.produtosEstoqueBaixo.length > 0
          ? [
              {
                tipo: 'estoque',
                mensagem: `${contagens.produtosEstoqueBaixo.length} produto(s) com estoque baixo`,
                severidade: 'info' as const,
              },
            ]
          : []),
      ],
    };
  }
}
