import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsuariosService } from './usuarios.service';
import {
  CreateUsuarioDto,
  UpdateAcessoUsuarioDto,
} from './dto/create-usuario.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { ExigeReautenticacao } from '../../common/decorators/permissoes.decorator';
import { ParseIdPipe } from '../../common/pipes/parse-id.pipe';

@ApiTags('usuarios')
@ApiBearerAuth()
@Roles('ADMINISTRADOR')
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly service: UsuariosService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  @ExigeReautenticacao()
  create(@Body() dto: CreateUsuarioDto) {
    return this.service.create(dto);
  }

  @Patch(':id/acesso')
  @ExigeReautenticacao()
  atualizarAcesso(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdateAcessoUsuarioDto,
  ) {
    return this.service.atualizarAcesso(id, dto);
  }
}
