import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class ClientesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(where: Prisma.ClienteWhereInput, skip: number, take: number) {
    const [data, total] = await Promise.all([
      this.prisma.cliente.findMany({
        where,
        skip,
        take,
        orderBy: { nomeCompleto: 'asc' },
      }),
      this.prisma.cliente.count({ where }),
    ]);
    return { data, total };
  }

  findById(id: number) {
    return this.prisma.cliente.findUnique({
      where: { id },
      include: { veiculos: { where: { ativo: true } } },
    });
  }

  create(data: Prisma.ClienteCreateInput) {
    return this.prisma.cliente.create({ data });
  }

  update(id: number, data: Prisma.ClienteUpdateInput) {
    return this.prisma.cliente.update({ where: { id }, data });
  }

  countVeiculos(id: number) {
    return this.prisma.veiculo.count({ where: { clienteId: id } });
  }
}
