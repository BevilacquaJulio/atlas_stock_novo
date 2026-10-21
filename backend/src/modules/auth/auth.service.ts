import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsuariosRepository } from '../usuarios/usuarios.repository';
import { RefreshTokenRepository } from './refresh-token.repository';
import {
  jwtPolicy,
  REAUTENTICACAO_TTL_SEGUNDOS,
} from '../../common/auth/jwt-policy';
import { temAcessoFinanceiro } from '../../common/auth/permissoes';
import { hashPassword, verifyPassword } from '../../common/auth/password';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import type { Cargo, Prisma } from '../../../generated/prisma/client';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
export type LoginResult = TokenPair & { user: AuthenticatedUser };
export const digest = (token: string) =>
  createHash('sha256').update(token).digest('hex');
const dummyHash = bcrypt.hashSync(randomUUID(), 10);
const dummyArgonHash = hashPassword(randomUUID());

@Injectable()
export class AuthService {
  constructor(
    private readonly usuarios: UsuariosRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, senha: string): Promise<LoginResult> {
    const candidate = await this.usuarios.findByEmailWithSenha(email);
    const fallback = await dummyArgonHash;
    // Durante a transição ambos os algoritmos custam trabalho também para e-mail inexistente.
    const [matches] = await Promise.all([
      verifyPassword(candidate?.senha ?? fallback, senha),
      verifyPassword(
        candidate?.senha.startsWith('$2') ? fallback : dummyHash,
        senha,
      ),
    ]);
    if (!matches || !candidate?.ativo)
      throw new UnauthorizedException('Credenciais inválidas.');
    const upgraded = candidate.senha.startsWith('$argon2id$')
      ? null
      : await hashPassword(senha);
    return this.refreshTokens.withUserLock(candidate.id, async (tx) => {
      const current = await this.usuarios.findByIdWithSenha(candidate.id, tx);
      if (!current?.ativo || current.senha !== candidate.senha)
        throw new UnauthorizedException('Credenciais inválidas.');
      if (upgraded)
        await tx.usuario.update({
          where: { id: current.id },
          data: { senha: upgraded },
        });
      const user = this.publicUser(current);
      const sessao = await tx.sessao.create({
        data: {
          id: randomUUID(),
          usuarioId: user.id,
          expiraEm: this.expiration(),
        },
      });
      user.sessaoId = sessao.id;
      return {
        ...(await this.issueTokens(user, sessao.id, sessao.expiraEm, tx)),
        user,
      };
    });
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const candidate = await this.refreshTokens.findByHash(digest(refreshToken));
    if (!candidate) throw this.expired();
    const result = await this.refreshTokens.withUserLock(
      candidate.usuarioId,
      async (tx) => {
        const row = await this.refreshTokens.findByHash(
          digest(refreshToken),
          tx,
        );
        if (
          !row?.sessao ||
          row.expiresAt <= new Date() ||
          row.sessao.expiraEm <= new Date() ||
          row.sessao.revogadoEm
        )
          return null;
        if (row.revokedAt) {
          // O 401 vem após o commit; reuso revoga só a família deste login.
          await this.refreshTokens.revokeSession(row.sessao.id, tx);
          return null;
        }
        const usuario = await this.usuarios.findById(row.usuarioId, tx);
        if (!usuario?.ativo) {
          await this.refreshTokens.revokeAllForUser(row.usuarioId, tx);
          return null;
        }
        await this.refreshTokens.revoke(row.id, tx);
        return this.issueTokens(
          this.publicUser(usuario),
          row.sessao.id,
          row.sessao.expiraEm,
          tx,
        );
      },
    );
    if (!result) throw this.expired();
    return result;
  }

  async logout(refreshToken: string): Promise<void> {
    const row = await this.refreshTokens.findByHash(digest(refreshToken));
    if (row?.sessaoId)
      await this.refreshTokens.withUserLock(row.usuarioId, (tx) =>
        this.refreshTokens.revokeSession(row.sessaoId!, tx),
      );
  }

  async reautenticar(user: AuthenticatedUser, senha: string) {
    return this.refreshTokens.withUserLock(user.id, async (tx) => {
      const current = await this.usuarios.findByIdWithSenha(user.id, tx);
      if (!current?.ativo || !(await verifyPassword(current.senha, senha)))
        throw new BadRequestException('Senha incorreta.');
      const token = await this.jwt.signAsync(
        { purpose: 'reautenticacao', sub: user.id, sid: user.sessaoId },
        {
          issuer: jwtPolicy.issuer,
          audience: jwtPolicy.audience,
          algorithm: 'HS256',
          secret: this.config.get<string>('JWT_ACCESS_SECRET'),
          expiresIn: REAUTENTICACAO_TTL_SEGUNDOS,
          jwtid: randomUUID(),
        },
      );
      return { token, expiresIn: REAUTENTICACAO_TTL_SEGUNDOS };
    });
  }

  async changePassword(
    user: AuthenticatedUser,
    senhaAtual: string,
    novaSenha: string,
  ) {
    const hash = await hashPassword(novaSenha);
    await this.refreshTokens.withUserLock(user.id, async (tx) => {
      const current = await this.usuarios.findByIdWithSenha(user.id, tx);
      if (!current?.ativo || !(await verifyPassword(current.senha, senhaAtual)))
        throw new BadRequestException('Senha incorreta.');
      await tx.usuario.update({
        where: { id: user.id },
        data: { senha: hash },
      });
      await tx.recuperacaoSenha.updateMany({
        where: { usuarioId: user.id, usadoEm: null },
        data: { usadoEm: new Date() },
      });
      await this.refreshTokens.revokeAllForUser(user.id, tx);
    });
  }

  async createRecovery(usuarioId: number) {
    const token = randomBytes(32).toString('base64url');
    await this.refreshTokens.withUserLock(usuarioId, async (tx) => {
      const usuario = await this.usuarios.findById(usuarioId, tx);
      if (!usuario?.ativo)
        throw new NotFoundException('Usuário ativo não encontrado.');
      await tx.recuperacaoSenha.updateMany({
        where: { usuarioId, usadoEm: null },
        data: { usadoEm: new Date() },
      });
      await tx.recuperacaoSenha.create({
        data: {
          usuarioId,
          resumoToken: digest(token),
          expiraEm: new Date(Date.now() + 900_000),
        },
      });
    });
    return { token, expiresIn: 900 };
  }

  async recoverPassword(token: string, novaSenha: string) {
    const row = await this.usuarios.findRecovery(digest(token));
    if (!row) throw new BadRequestException('Link inválido ou expirado.');
    const hash = await hashPassword(novaSenha);
    await this.refreshTokens.withUserLock(row.usuarioId, async (tx) => {
      const recovery = await tx.recuperacaoSenha.findUnique({
        where: { id: row.id },
      });
      const current = await this.usuarios.findByIdWithSenha(row.usuarioId, tx);
      if (
        !recovery ||
        recovery.usadoEm ||
        recovery.expiraEm <= new Date() ||
        !current?.ativo
      )
        throw new BadRequestException('Link inválido ou expirado.');
      await tx.recuperacaoSenha.updateMany({
        where: { usuarioId: row.usuarioId, usadoEm: null },
        data: { usadoEm: new Date() },
      });
      await tx.usuario.update({
        where: { id: row.usuarioId },
        data: { senha: hash },
      });
      await this.refreshTokens.revokeAllForUser(row.usuarioId, tx);
    });
  }

  listSessions(user: AuthenticatedUser) {
    return this.usuarios.listSessions(user.id);
  }
  revokeSession(user: AuthenticatedUser, id: string) {
    return this.refreshTokens.withUserLock(user.id, async (tx) => {
      const session = await tx.sessao.findFirst({
        where: { id, usuarioId: user.id },
      });
      if (!session) throw new NotFoundException('Sessão não encontrada.');
      await this.refreshTokens.revokeSession(id, tx);
    });
  }

  private expiration() {
    return new Date(
      Date.now() +
        Number(this.config.get('REFRESH_TOKEN_TTL_SECONDS', 604800)) * 1000,
    );
  }
  private expired() {
    return new UnauthorizedException('Sessão expirada. Faça login novamente.');
  }
  private publicUser(user: {
    id: number;
    nome: string;
    email: string;
    cargo: Cargo;
    acessoFinanceiro: boolean;
  }): AuthenticatedUser {
    return {
      id: user.id,
      nome: user.nome,
      email: user.email,
      cargo: user.cargo,
      acessoFinanceiro: temAcessoFinanceiro(user),
    };
  }
  private async issueTokens(
    user: AuthenticatedUser,
    sid: string,
    expiresAt: Date,
    tx: Prisma.TransactionClient,
  ): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync(
      { purpose: 'access', sub: user.id, sid },
      {
        issuer: jwtPolicy.issuer,
        audience: jwtPolicy.audience,
        algorithm: 'HS256',
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>(
          'JWT_ACCESS_EXPIRES_IN',
          '15m',
        ) as JwtSignOptions['expiresIn'],
        jwtid: randomUUID(),
      },
    );
    const refreshToken = randomBytes(32).toString('base64url');
    await this.refreshTokens.create(
      user.id,
      sid,
      digest(refreshToken),
      expiresAt,
      tx,
    );
    return { accessToken, refreshToken };
  }
}
