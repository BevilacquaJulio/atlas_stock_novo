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
import { ComprasService } from './compras.service';
import {
  CompraQueryDto,
  CreateCompraDto,
  PagarCompraDto,
} from './dto/compra.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { Roles } from '../../common/decorators/roles.decorator';
import { CARGOS_GESTAO, TODOS_OS_CARGOS } from '../../common/auth/permissoes';
import {
  AcessoFinanceiro,
  ExigeReautenticacao,
} from '../../common/decorators/permissoes.decorator';

@ApiTags('compras')
@ApiBearerAuth()
/**
 * Compras são abertas a todos os cargos; pagamento, estorno do pagamento e
 * cancelamento mexem no financeiro e seguem a mesma regra do módulo
 * financeiro. Estornar o recebimento (saída do estoque) é da gestão.
 */
@Roles(...TODOS_OS_CARGOS)
@Controller('compras')
export class ComprasController {
  constructor(private readonly service: ComprasService) {}

  @Get()
  list(@Query() query: CompraQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIdPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCompraDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id/pagar')
  @AcessoFinanceiro()
  @ExigeReautenticacao()
  pagar(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: PagarCompraDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.pagar(id, dto, user.id);
  }

  @Patch(':id/confirmar')
  confirmar(
    @Param('id', ParseIdPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.confirmar(id, user.id);
  }

  @Patch(':id/desconfirmar')
  @Roles(...CARGOS_GESTAO)
  desconfirmar(
    @Param('id', ParseIdPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.desconfirmar(id, user.id);
  }

  @Patch(':id/estornar-pagamento')
  @AcessoFinanceiro()
  @ExigeReautenticacao()
  estornarPagamento(@Param('id', ParseIdPipe) id: number) {
    return this.service.estornarPagamento(id);
  }

  @Patch(':id/cancelar')
  @AcessoFinanceiro()
  @ExigeReautenticacao()
  cancelar(@Param('id', ParseIdPipe) id: number) {
    return this.service.cancelar(id);
  }
}
