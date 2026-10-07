import { Module } from '@nestjs/common';
import { ProjetosController } from './projetos.controller';
import { ProjetosService } from './projetos.service';
import { ProjetosRepository } from './projetos.repository';
import { ClientesModule } from '../clientes/clientes.module';
import { VeiculosModule } from '../veiculos/veiculos.module';
import { ProdutosModule } from '../produtos/produtos.module';
import { MovimentacoesModule } from '../movimentacoes/movimentacoes.module';
import { ClientesRepository } from '../clientes/clientes.repository';
import { VeiculosRepository } from '../veiculos/veiculos.repository';
import { ProdutosRepository } from '../produtos/produtos.repository';
import { MovimentacoesRepository } from '../movimentacoes/movimentacoes.repository';

@Module({
  imports: [ClientesModule, VeiculosModule, ProdutosModule, MovimentacoesModule],
  controllers: [ProjetosController],
  providers: [
    ProjetosService,
    ProjetosRepository,
    ClientesRepository,
    VeiculosRepository,
    ProdutosRepository,
    MovimentacoesRepository,
  ],
  exports: [ProjetosService],
})
export class ProjetosModule {}
