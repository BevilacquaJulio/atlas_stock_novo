import { Module } from '@nestjs/common';
import { FinanceiroController } from './financeiro.controller';
import { FinanceiroService } from './financeiro.service';
import { FinanceiroRepository } from './financeiro.repository';

@Module({
  controllers: [FinanceiroController],
  providers: [FinanceiroService, FinanceiroRepository],
  exports: [FinanceiroService],
})
export class FinanceiroModule {}
