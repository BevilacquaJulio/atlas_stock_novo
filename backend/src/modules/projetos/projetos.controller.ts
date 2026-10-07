import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProjetosService } from './projetos.service';
import {
  AlterarStatusProjetoDto,
  CreateChecklistItemDto,
  CreateConsumoDto,
  CreateProjetoDto,
  ProjetoQueryDto,
  UpdateChecklistItemDto,
  UpdateProjetoDto,
} from './dto/projeto.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';

@ApiTags('projetos')
@ApiBearerAuth()
@Controller('projetos')
export class ProjetosController {
  constructor(private readonly service: ProjetosService) {}

  @Get()
  list(@Query() query: ProjetoQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(
    @Body() dto: CreateProjetoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProjetoDto,
  ) {
    return this.service.update(id, dto);
  }

  @Patch(':id/status')
  alterarStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AlterarStatusProjetoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.alterarStatus(id, dto, user.id);
  }

  @Delete(':id')
  @Roles('ADMINISTRADOR', 'GERENTE')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.service.remove(id);
  }

  @Post(':id/checklist')
  addChecklistItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateChecklistItemDto,
  ) {
    return this.service.addChecklistItem(id, dto);
  }

  @Patch(':id/checklist/:itemId')
  updateChecklistItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateChecklistItemDto,
  ) {
    return this.service.updateChecklistItem(id, itemId, dto);
  }

  @Delete(':id/checklist/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeChecklistItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ): Promise<void> {
    await this.service.removeChecklistItem(id, itemId);
  }

  @Post(':id/consumos')
  registrarConsumo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateConsumoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.registrarConsumo(id, dto, user.id);
  }
}
