import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoriasRepository } from './categorias.repository';
import {
  buildPaginated,
  type PaginationParams,
} from '../../common/dto/pagination.dto';
import type {
  CreateCategoriaInput,
  UpdateCategoriaInput,
} from './dto/categoria.dto';
import type { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class CategoriasService {
  constructor(private readonly repo: CategoriasRepository) {}

  async list({ page, limit, search }: PaginationParams) {
    const where: Prisma.CategoriaWhereInput = search
      ? { nome: { contains: search } }
      : {};
    const { data, total } = await this.repo.findMany(
      where,
      (page - 1) * limit,
      limit,
    );
    return buildPaginated(data, total, { page, limit });
  }

  async findOne(id: number) {
    const categoria = await this.repo.findById(id);
    if (!categoria) throw new NotFoundException('Categoria não encontrada.');
    return categoria;
  }

  async create(input: CreateCategoriaInput) {
    const existing = await this.repo.findByNome(input.nome);
    if (existing) {
      throw new ConflictException('Já existe uma categoria com este nome.');
    }
    return this.repo.create(input);
  }

  async update(id: number, input: UpdateCategoriaInput) {
    await this.findOne(id);
    if (input.nome) {
      const existing = await this.repo.findByNome(input.nome);
      if (existing && existing.id !== id) {
        throw new ConflictException('Já existe uma categoria com este nome.');
      }
    }
    return this.repo.update(id, input);
  }

  async remove(id: number) {
    await this.findOne(id);
    const emUso = await this.repo.countProdutos(id);
    if (emUso > 0) {
      throw new ConflictException(
        `Não é possível excluir: ${emUso} produto(s) usam esta categoria.`,
      );
    }
    await this.repo.delete(id);
  }
}
