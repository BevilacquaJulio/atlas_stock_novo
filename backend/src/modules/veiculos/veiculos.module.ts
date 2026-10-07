import { Module } from '@nestjs/common';
import { VeiculosController } from './veiculos.controller';
import { VeiculosService } from './veiculos.service';
import { VeiculosRepository } from './veiculos.repository';

@Module({
  controllers: [VeiculosController],
  providers: [VeiculosService, VeiculosRepository],
  exports: [VeiculosService],
})
export class VeiculosModule {}
