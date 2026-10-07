import { Module } from '@nestjs/common';
import { MovimentacoesController } from './movimentacoes.controller';
import { MovimentacoesService } from './movimentacoes.service';
import { MovimentacoesRepository } from './movimentacoes.repository';
import { ProdutosModule } from '../produtos/produtos.module';
import { ProdutosRepository } from '../produtos/produtos.repository';

@Module({
  imports: [ProdutosModule],
  controllers: [MovimentacoesController],
  providers: [
    MovimentacoesService,
    MovimentacoesRepository,
    ProdutosRepository,
  ],
})
export class MovimentacoesModule {}
