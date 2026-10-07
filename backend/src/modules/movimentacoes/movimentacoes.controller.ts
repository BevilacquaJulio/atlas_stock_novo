import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MovimentacoesService } from './movimentacoes.service';
import {
  CreateMovimentacaoDto,
  MovimentacaoQueryDto,
} from './dto/movimentacao.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';

@ApiTags('movimentacoes')
@ApiBearerAuth()
@Controller('movimentacoes')
export class MovimentacoesController {
  constructor(private readonly service: MovimentacoesService) {}

  @Get()
  list(@Query() query: MovimentacaoQueryDto) {
    return this.service.list(query);
  }

  @Post()
  create(
    @Body() dto: CreateMovimentacaoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user.id);
  }
}
