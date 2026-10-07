import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsuariosRepository } from './usuarios.repository';
import type { Cargo } from '../../../generated/prisma/client';

const BCRYPT_COST = 10;

@Injectable()
export class UsuariosService {
  constructor(private readonly repo: UsuariosRepository) {}

  list() {
    return this.repo.list();
  }

  async create(data: {
    nome: string;
    email: string;
    senha: string;
    cargo: Cargo;
  }) {
    const existing = await this.repo.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('Já existe um usuário com este e-mail.');
    }
    const senhaHash = await bcrypt.hash(data.senha, BCRYPT_COST);
    return this.repo.create({ ...data, senha: senhaHash });
  }
}
