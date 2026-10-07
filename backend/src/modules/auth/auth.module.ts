import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshTokenRepository } from './refresh-token.repository';
import { UsuariosModule } from '../usuarios/usuarios.module';

@Module({
  imports: [
    // Global para que o JwtAuthGuard (APP_GUARD) consiga injetar o JwtService.
    JwtModule.register({ global: true }),
    UsuariosModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, RefreshTokenRepository],
  exports: [AuthService],
})
export class AuthModule {}
