import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class FornecedoresRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    where: Prisma.FornecedorWhereInput,
    skip: number,
    take: number,
  ) {
    const [data, total] = await Promise.all([
      this.prisma.fornecedor.findMany({
        where,
        skip,
        take,
        orderBy: { nomeRazaoSocial: 'asc' },
      }),
      this.prisma.fornecedor.count({ where }),
    ]);
    return { data, total };
  }

  findById(id: number) {
    return this.prisma.fornecedor.findUnique({ where: { id } });
  }

  create(data: Prisma.FornecedorCreateInput) {
    return this.prisma.fornecedor.create({ data });
  }

  update(id: number, data: Prisma.FornecedorUpdateInput) {
    return this.prisma.fornecedor.update({ where: { id }, data });
  }
}
