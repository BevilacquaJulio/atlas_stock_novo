import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CategoriasService } from './categorias.service';
import { CategoriasRepository } from './categorias.repository';

const makeRepo = () => ({
  findMany: vi.fn(),
  findById: vi.fn(),
  findByNome: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  countProdutos: vi.fn(),
});

describe('CategoriasService', () => {
  let repo: ReturnType<typeof makeRepo>;
  let service: CategoriasService;

  beforeEach(() => {
    repo = makeRepo();
    service = new CategoriasService(repo as unknown as CategoriasRepository);
  });

  it('lista de forma paginada', async () => {
    repo.findMany.mockResolvedValue({
      data: [{ id: 1, nome: 'Vidros' }],
      total: 1,
    });
    const result = await service.list({ page: 1, limit: 20 });
    expect(result).toEqual({
      data: [{ id: 1, nome: 'Vidros' }],
      total: 1,
      page: 1,
      limit: 20,
    });
    expect(repo.findMany).toHaveBeenCalledWith({}, 0, 20);
  });

  it('cria uma categoria nova', async () => {
    repo.findByNome.mockResolvedValue(null);
    repo.create.mockResolvedValue({ id: 1, nome: 'Aço' });
    const result = await service.create({ nome: 'Aço', ativo: true });
    expect(result).toEqual({ id: 1, nome: 'Aço' });
  });

  it('rejeita nome duplicado com 409', async () => {
    repo.findByNome.mockResolvedValue({ id: 2, nome: 'Aço' });
    await expect(
      service.create({ nome: 'Aço', ativo: true }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('findOne inexistente lança 404', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.findOne(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('não exclui categoria em uso', async () => {
    repo.findById.mockResolvedValue({ id: 1, nome: 'Aço' });
    repo.countProdutos.mockResolvedValue(3);
    await expect(service.remove(1)).rejects.toBeInstanceOf(ConflictException);
    expect(repo.delete).not.toHaveBeenCalled();
  });
});
