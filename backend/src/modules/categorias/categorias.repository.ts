import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class CategoriasRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(where: Prisma.CategoriaWhereInput, skip: number, take: number) {
    const [data, total] = await Promise.all([
      this.prisma.categoria.findMany({
        where,
        skip,
        take,
        orderBy: { nome: 'asc' },
      }),
      this.prisma.categoria.count({ where }),
    ]);
    return { data, total };
  }

  findById(id: number) {
    return this.prisma.categoria.findUnique({ where: { id } });
  }

  findByNome(nome: string) {
    return this.prisma.categoria.findUnique({ where: { nome } });
  }

  create(data: Prisma.CategoriaCreateInput) {
    return this.prisma.categoria.create({ data });
  }

  update(id: number, data: Prisma.CategoriaUpdateInput) {
    return this.prisma.categoria.update({ where: { id }, data });
  }

  delete(id: number) {
    return this.prisma.categoria.delete({ where: { id } });
  }

  countProdutos(id: number) {
    return this.prisma.produto.count({ where: { categoriaId: id } });
  }
}
