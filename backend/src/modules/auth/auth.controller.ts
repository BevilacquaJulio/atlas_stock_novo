import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  LoginDto,
  ReautenticarDto,
  ChangePasswordDto,
  RecoverPasswordDto,
  MfaCodeDto,
  RefreshDto,
} from './dto/auth.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ExigeReautenticacao } from '../../common/decorators/permissoes.decorator';
import { TODOS_OS_CARGOS } from '../../common/auth/permissoes';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { ParseIdPipe } from '../../common/pipes/parse-id.pipe';
import {
  clearRefreshCookie,
  readRefreshCookie,
  requireBrowserOrigin,
  setRefreshCookie,
} from './session-cookie';

@ApiTags('auth')
@ApiBearerAuth()
@Roles(...TODOS_OS_CARGOS)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly service: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    requireBrowserOrigin(req, this.config);
    const { refreshToken, ...result } = await this.service.login(
      dto.email,
      dto.senha,
      dto.codigo,
    );
    setRefreshCookie(res, this.config, refreshToken);
    return result;
  }

  @Public()
  @Post('refresh')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() _dto?: RefreshDto,
  ) {
    requireBrowserOrigin(req, this.config);
    try {
      const { refreshToken, accessToken } = await this.service.refresh(
        readRefreshCookie(req),
      );
      setRefreshCookie(res, this.config, refreshToken);
      return { accessToken };
    } catch (error) {
      if (error instanceof UnauthorizedException)
        clearRefreshCookie(res, this.config);
      throw error;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() _dto?: RefreshDto,
  ) {
    requireBrowserOrigin(req, this.config);
    try {
      await this.service.logout(readRefreshCookie(req));
    } catch (error) {
      if (!(error instanceof UnauthorizedException)) throw error;
    } finally {
      clearRefreshCookie(res, this.config);
    }
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  @Post('reautenticar')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  reautenticar(
    @Body() dto: ReautenticarDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.reautenticar(user, dto.senha, dto.codigo);
  }

  @Post('senha')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.service.changePassword(
      user,
      dto.senhaAtual,
      dto.novaSenha,
      dto.codigo,
    );
    clearRefreshCookie(res, this.config);
  }

  @Roles('ADMINISTRADOR')
  @ExigeReautenticacao()
  @Post('recuperacao/:id')
  recovery(
    @Param('id', ParseIdPipe) id: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Cache-Control', 'no-store');
    return this.service.createRecovery(id);
  }

  @Public()
  @Post('recuperar')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async recover(
    @Body() dto: RecoverPasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    requireBrowserOrigin(req, this.config);
    await this.service.recoverPassword(dto.token, dto.novaSenha, dto.codigo);
    clearRefreshCookie(res, this.config);
  }

  @Get('sessoes')
  sessions(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listSessions(user);
  }

  @Delete('sessoes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.service.revokeSession(user, id);
  }

  @Post('mfa/configurar')
  @ExigeReautenticacao()
  setupMfa(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Cache-Control', 'no-store');
    return this.service.setupMfa(user);
  }

  @Post('mfa/ativar')
  @ExigeReautenticacao()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  enableMfa(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MfaCodeDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    clearRefreshCookie(res, this.config);
    return this.service.enableMfa(user, dto.codigo);
  }

  @Post('mfa/desativar')
  @ExigeReautenticacao()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  disableMfa(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MfaCodeDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    clearRefreshCookie(res, this.config);
    return this.service.disableMfa(user, dto.codigo);
  }
}
