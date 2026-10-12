import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { Roles } from '../../common/decorators/roles.decorator';
import { TODOS_OS_CARGOS } from '../../common/auth/permissoes';

@ApiTags('dashboard')
@ApiBearerAuth()
@Roles(...TODOS_OS_CARGOS)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get()
  overview(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getOverview(user.acessoFinanceiro);
  }
}
