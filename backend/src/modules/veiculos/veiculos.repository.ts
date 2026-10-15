import { BadRequestException, Injectable } from '@nestjs/common';
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
    return this.prisma.withAudit(async (tx) => {
      await tx.$queryRaw`SELECT id FROM veiculos WHERE id = ${id} FOR UPDATE`;
      const clienteId = data.cliente?.connect?.id;
      if (clienteId !== undefined) {
        const cliente = await tx.cliente.findFirst({
          where: { id: clienteId, ativo: true },
        });
        if (!cliente)
          throw new BadRequestException('Cliente inválido ou inativo.');
        if (
          await tx.projeto.count({
            where: { veiculoId: id, clienteId: { not: clienteId } },
          })
        )
          throw new BadRequestException(
            'O veículo possui projetos vinculados a outro cliente.',
          );
      }
      return tx.veiculo.update({ where: { id }, data });
    });
  }

  clienteExists(clienteId: number) {
    return this.prisma.cliente.count({ where: { id: clienteId, ativo: true } });
  }
}
