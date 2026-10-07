import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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

@ApiTags('compras')
@ApiBearerAuth()
@Controller('compras')
export class ComprasController {
  constructor(private readonly service: ComprasService) {}

  @Get()
  list(@Query() query: CompraQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(
    @Body() dto: CreateCompraDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id/pagar')
  pagar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PagarCompraDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.pagar(id, dto, user.id);
  }

  @Patch(':id/confirmar')
  confirmar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.confirmar(id, user.id);
  }

  @Patch(':id/desconfirmar')
  desconfirmar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.desconfirmar(id, user.id);
  }

  @Patch(':id/estornar-pagamento')
  estornarPagamento(@Param('id', ParseIntPipe) id: number) {
    return this.service.estornarPagamento(id);
  }

  @Patch(':id/cancelar')
  cancelar(@Param('id', ParseIntPipe) id: number) {
    return this.service.cancelar(id);
  }
}
