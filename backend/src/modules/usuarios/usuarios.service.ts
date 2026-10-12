import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsuariosRepository } from './usuarios.repository';
import {
  MENSAGEM_ACESSO_FINANCEIRO,
  type CreateUsuarioInput,
  type UpdateAcessoUsuarioInput,
} from './dto/create-usuario.dto';

const BCRYPT_COST = 10;

@Injectable()
export class UsuariosService {
  constructor(private readonly repo: UsuariosRepository) {}

  list() {
    return this.repo.list();
  }

  async create(data: CreateUsuarioInput) {
    const existing = await this.repo.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('Já existe um usuário com este e-mail.');
    }
    const senhaHash = await bcrypt.hash(data.senha, BCRYPT_COST);
    return this.repo.create({ ...data, senha: senhaHash });
  }

  /**
   * Altera cargo, estado e permissão financeira. Inativação e troca de cargo
   * valem na próxima requisição do usuário (o JwtAuthGuard consulta o banco).
   */
  atualizarAcesso(id: number, input: UpdateAcessoUsuarioInput) {
    return this.repo.runInTransaction(async (tx) => {
      const administradores = await this.repo.travarAdministradoresAtivos(tx);
      const atual = await this.repo.findById(id, tx);
      if (!atual) throw new NotFoundException('Usuário não encontrado.');

      const cargo = input.cargo ?? atual.cargo;
      const ativo = input.ativo ?? atual.ativo;
      if (input.acessoFinanceiro === true && cargo !== 'GERENTE') {
        throw new BadRequestException(MENSAGEM_ACESSO_FINANCEIRO);
      }
      // Fora do cargo de gerente a permissão não se aplica: não fica guardada
      // para "voltar sozinha" numa promoção futura.
      const acessoFinanceiro =
        cargo === 'GERENTE'
          ? (input.acessoFinanceiro ?? atual.acessoFinanceiro)
          : false;

      const deixaDeSerAdministradorAtivo =
        atual.cargo === 'ADMINISTRADOR' &&
        atual.ativo &&
        (cargo !== 'ADMINISTRADOR' || !ativo);
      if (
        deixaDeSerAdministradorAtivo &&
        !administradores.some((adminId) => adminId !== id)
      ) {
        throw new ConflictException(
          'Não é possível remover o último administrador ativo.',
        );
      }

      return this.repo.update(id, { cargo, ativo, acessoFinanceiro }, tx);
    });
  }
}
