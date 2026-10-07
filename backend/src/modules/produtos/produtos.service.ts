import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProdutosRepository } from './produtos.repository';
import {
  buildPaginated,
  type PaginationParams,
} from '../../common/dto/pagination.dto';
import type {
  CreateProdutoInput,
  UpdateProdutoInput,
} from './dto/produto.dto';
import type { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class ProdutosService {
  constructor(private readonly repo: ProdutosRepository) {}

  async list({ page, limit, search, ativo }: PaginationParams) {
    const where: Prisma.ProdutoWhereInput = {
      ...(ativo !== undefined ? { ativo } : {}),
      ...(search
        ? {
            OR: [
              { nome: { contains: search } },
              { codigo: { contains: search } },
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
    const produto = await this.repo.findById(id);
    if (!produto) throw new NotFoundException('Produto não encontrado.');
    return produto;
  }

  async create(input: CreateProdutoInput, usuarioId: number) {
    const existing = await this.repo.findByCodigo(input.codigo);
    if (existing) {
      throw new ConflictException('Já existe um produto com este código.');
    }

    const { estoqueInicial, categoriaId, valorUnitario, projetoId, ...rest } =
      input;

    const data: Prisma.ProdutoCreateInput = {
      ...rest,
      valorUnitario,
      quantidadeEstoque: estoqueInicial,
      custoMedio: valorUnitario,
      ...(categoriaId
        ? { categoria: { connect: { id: categoriaId } } }
        : {}),
      ...(projetoId ? { projeto: { connect: { id: projetoId } } } : {}),
    };

    return this.repo.createWithInitialStock(
      data,
      estoqueInicial,
      valorUnitario,
      usuarioId,
    );
  }

  async update(id: number, input: UpdateProdutoInput) {
    await this.findOne(id);
    if (input.codigo) {
      const existing = await this.repo.findByCodigo(input.codigo);
      if (existing && existing.id !== id) {
        throw new ConflictException('Já existe um produto com este código.');
      }
    }

    const { categoriaId, projetoId, ...rest } = input;
    const data: Prisma.ProdutoUpdateInput = { ...rest };
    if (categoriaId !== undefined) {
      data.categoria =
        categoriaId === null
          ? { disconnect: true }
          : { connect: { id: categoriaId } };
    }
    if (projetoId !== undefined) {
      data.projeto =
        projetoId === null
          ? { disconnect: true }
          : { connect: { id: projetoId } };
    }
    return this.repo.update(id, data);
  }

  /** Exclusão lógica por padrão; exclusão física só se não houver movimentações. */
  async remove(id: number) {
    await this.findOne(id);
    return this.repo.update(id, { ativo: false });
  }

  async removePermanent(id: number) {
    await this.findOne(id);
    const refs = await this.repo.countReferences(id);
    if (refs > 0) {
      throw new BadRequestException(
        `Produto vinculado a ${refs} movimentação(ões). Use a exclusão lógica.`,
      );
    }
    await this.repo.delete(id);
  }
}
