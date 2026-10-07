import { Injectable, NotFoundException } from '@nestjs/common';
import { FornecedoresRepository } from './fornecedores.repository';
import {
  buildPaginated,
  type PaginationParams,
} from '../../common/dto/pagination.dto';
import type {
  CreateFornecedorInput,
  UpdateFornecedorInput,
} from './dto/fornecedor.dto';
import type { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class FornecedoresService {
  constructor(private readonly repo: FornecedoresRepository) {}

  async list({ page, limit, search, ativo }: PaginationParams) {
    const where: Prisma.FornecedorWhereInput = {
      ...(ativo !== undefined ? { ativo } : {}),
      ...(search
        ? {
            OR: [
              { nomeRazaoSocial: { contains: search } },
              { cpfCnpj: { contains: search } },
            ],
          }
        : {}),
    };
    const { data, total } = await this.repo.findMany(
      where,
      (page - 1) * limit,
      limit,
    );
    return buildPaginated(data, total, { page, limit });
  }

  async findOne(id: number) {
    const fornecedor = await this.repo.findById(id);
    if (!fornecedor) throw new NotFoundException('Fornecedor não encontrado.');
    return fornecedor;
  }

  create(input: CreateFornecedorInput) {
    return this.repo.create(this.normalize(input));
  }

  async update(id: number, input: UpdateFornecedorInput) {
    await this.findOne(id);
    return this.repo.update(id, this.normalize(input));
  }

  /** Exclusão lógica: inativa o fornecedor. */
  async remove(id: number) {
    await this.findOne(id);
    return this.repo.update(id, { ativo: false });
  }

  private normalize<T extends { email?: string | null }>(input: T): T {
    return { ...input, email: input.email === '' ? null : input.email };
  }
}
