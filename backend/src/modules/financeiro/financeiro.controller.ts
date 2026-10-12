import { ParseIdPipe } from '../../common/pipes/parse-id.pipe';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FinanceiroService } from './financeiro.service';
import {
  CreateCategoriaDespesaDto,
  CreateDespesaDto,
  CreateReceitaDto,
  FinanceiroQueryDto,
  PagarDespesaDto,
  ReceberReceitaDto,
  UpdateDespesaDto,
  UpdateReceitaDto,
} from './dto/financeiro.dto';
import {
  AcessoFinanceiro,
  ExigeReautenticacao,
} from '../../common/decorators/permissoes.decorator';

/** Todo o módulo exige permissão financeira; baixas exigem também reautenticação. */
@ApiTags('financeiro')
@ApiBearerAuth()
@AcessoFinanceiro()
@Controller('financeiro')
export class FinanceiroController {
  constructor(private readonly service: FinanceiroService) {}

  @Get('resumo')
  resumo() {
    return this.service.resumo();
  }

  @Get('despesas')
  listDespesas(@Query() query: FinanceiroQueryDto) {
    return this.service.listDespesas(query);
  }

  @Get('despesas/:id')
  findDespesa(@Param('id', ParseIdPipe) id: number) {
    return this.service.findDespesa(id);
  }

  @Post('despesas')
  createDespesa(@Body() dto: CreateDespesaDto) {
    return this.service.createDespesa(dto);
  }

  @Patch('despesas/:id')
  updateDespesa(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdateDespesaDto,
  ) {
    return this.service.updateDespesa(id, dto);
  }

  @Patch('despesas/:id/pagar')
  @ExigeReautenticacao()
  pagarDespesa(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: PagarDespesaDto,
  ) {
    return this.service.pagarDespesa(id, dto.dataPagamento);
  }

  @Get('receitas')
  listReceitas(@Query() query: FinanceiroQueryDto) {
    return this.service.listReceitas(query);
  }

  @Get('receitas/:id')
  findReceita(@Param('id', ParseIdPipe) id: number) {
    return this.service.findReceita(id);
  }

  @Post('receitas')
  createReceita(@Body() dto: CreateReceitaDto) {
    return this.service.createReceita(dto);
  }

  @Patch('receitas/:id')
  updateReceita(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdateReceitaDto,
  ) {
    return this.service.updateReceita(id, dto);
  }

  @Patch('receitas/:id/receber')
  @ExigeReautenticacao()
  receberReceita(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: ReceberReceitaDto,
  ) {
    return this.service.receberReceita(id, dto.dataRecebimento);
  }

  @Get('categorias-despesa')
  listCategorias() {
    return this.service.listCategoriasDespesa();
  }

  @Post('categorias-despesa')
  createCategoria(@Body() dto: CreateCategoriaDespesaDto) {
    return this.service.createCategoriaDespesa(dto);
  }
}
