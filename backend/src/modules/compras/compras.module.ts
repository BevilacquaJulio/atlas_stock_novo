import { Module } from '@nestjs/common';
import { ComprasController } from './compras.controller';
import { ComprasService } from './compras.service';
import { ComprasRepository } from './compras.repository';
import { FornecedoresModule } from '../fornecedores/fornecedores.module';
import { ProdutosModule } from '../produtos/produtos.module';
import { MovimentacoesModule } from '../movimentacoes/movimentacoes.module';
import { FornecedoresRepository } from '../fornecedores/fornecedores.repository';
import { ProdutosRepository } from '../produtos/produtos.repository';
import { MovimentacoesRepository } from '../movimentacoes/movimentacoes.repository';

@Module({
  imports: [FornecedoresModule, ProdutosModule, MovimentacoesModule],
  controllers: [ComprasController],
  providers: [
    ComprasService,
    ComprasRepository,
    FornecedoresRepository,
    ProdutosRepository,
    MovimentacoesRepository,
  ],
  exports: [ComprasService],
})
export class ComprasModule {}
