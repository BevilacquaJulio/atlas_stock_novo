import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { VeiculosRepository } from './veiculos.repository';
import {
  buildPaginated,
} from '../../common/dto/pagination.dto';
import type {
  CreateVeiculoInput,
  UpdateVeiculoInput,
  VeiculoQuery,
} from './dto/veiculo.dto';
import type { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class VeiculosService {
  constructor(private readonly repo: VeiculosRepository) {}

  async list({ page, limit, search, ativo, clienteId }: VeiculoQuery) {
    const where: Prisma.VeiculoWhereInput = {
      ...(ativo !== undefined ? { ativo } : {}),
      ...(clienteId ? { clienteId } : {}),
      ...(search
        ? {
            OR: [
              { placa: { contains: search } },
              { marca: { contains: search } },
              { modelo: { contains: search } },
              { cliente: { nomeCompleto: { contains: search } } },
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
    const veiculo = await this.repo.findById(id);
    if (!veiculo) throw new NotFoundException('Veículo não encontrado.');
    return veiculo;
  }

  async create(input: CreateVeiculoInput) {
    await this.assertCliente(input.clienteId);
    const { clienteId, ...rest } = input;
    return this.repo.create({
      ...rest,
      cliente: { connect: { id: clienteId } },
    });
  }

  async update(id: number, input: UpdateVeiculoInput) {
    await this.findOne(id);
    const { clienteId, ...rest } = input;
    const data: Prisma.VeiculoUpdateInput = { ...rest };
    if (clienteId !== undefined) {
      await this.assertCliente(clienteId);
      data.cliente = { connect: { id: clienteId } };
    }
    return this.repo.update(id, data);
  }

  /** Exclusão lógica: inativa o veículo. */
  async remove(id: number) {
    await this.findOne(id);
    return this.repo.update(id, { ativo: false });
  }

  private async assertCliente(clienteId: number) {
    const exists = await this.repo.clienteExists(clienteId);
    if (!exists) {
      throw new BadRequestException('Cliente informado não existe.');
    }
  }
}
