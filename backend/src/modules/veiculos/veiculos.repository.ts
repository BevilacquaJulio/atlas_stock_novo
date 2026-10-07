import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class VeiculosRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(where: Prisma.VeiculoWhereInput, skip: number, take: number) {
    const [data, total] = await Promise.all([
      this.prisma.veiculo.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          cliente: { select: { id: true, nomeCompleto: true } },
        },
      }),
      this.prisma.veiculo.count({ where }),
    ]);
    return { data, total };
  }

  findById(id: number) {
    return this.prisma.veiculo.findUnique({
      where: { id },
      include: { cliente: { select: { id: true, nomeCompleto: true } } },
    });
  }

  create(data: Prisma.VeiculoCreateInput) {
    return this.prisma.veiculo.create({ data });
  }

  update(id: number, data: Prisma.VeiculoUpdateInput) {
    return this.prisma.veiculo.update({ where: { id }, data });
  }

  clienteExists(clienteId: number) {
    return this.prisma.cliente.count({ where: { id: clienteId } });
  }
}
