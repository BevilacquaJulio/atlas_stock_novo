import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import type { UsuariosRepository } from './usuarios.repository';
import { createUsuarioSchema } from './dto/create-usuario.dto';

const TX = { fake: 'tx' };

type Linha = {
  id: number;
  cargo: 'ADMINISTRADOR' | 'GERENTE' | 'OPERADOR';
  ativo: boolean;
  acessoFinanceiro: boolean;
};

describe('UsuariosService.atualizarAcesso', () => {
  let repo: {
    runInTransaction: ReturnType<typeof vi.fn>;
    travarAdministradoresAtivos: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let service: UsuariosService;

  const com = (atual: Linha | null, administradores: number[]) => {
    repo.findById.mockResolvedValue(atual);
    repo.travarAdministradoresAtivos.mockResolvedValue(administradores);
  };

  beforeEach(() => {
    repo = {
      runInTransaction: vi.fn((fn: (tx: unknown) => unknown) => fn(TX)),
      travarAdministradoresAtivos: vi.fn(),
      findById: vi.fn(),
      update: vi.fn((id: number, data: object) => ({ id, ...data })),
    };
    service = new UsuariosService(repo as unknown as UsuariosRepository);
  });

  it('trava os administradores antes de ler o usuário', async () => {
    com(
      { id: 2, cargo: 'OPERADOR', ativo: true, acessoFinanceiro: false },
      [1],
    );

    await service.atualizarAcesso(2, { cargo: 'GERENTE' });

    expect(repo.travarAdministradoresAtivos).toHaveBeenCalledWith(TX);
    expect(
      repo.travarAdministradoresAtivos.mock.invocationCallOrder[0],
    ).toBeLessThan(repo.findById.mock.invocationCallOrder[0]);
  });

  it.each([
    ['rebaixar', { cargo: 'GERENTE' as const }],
    ['inativar', { ativo: false }],
  ])('não deixa %s o último administrador ativo', async (_acao, input) => {
    com(
      { id: 1, cargo: 'ADMINISTRADOR', ativo: true, acessoFinanceiro: false },
      [1],
    );

    await expect(service.atualizarAcesso(1, input)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('permite rebaixar um administrador quando há outro ativo', async () => {
    com(
      { id: 1, cargo: 'ADMINISTRADOR', ativo: true, acessoFinanceiro: false },
      [1, 5],
    );

    await service.atualizarAcesso(1, { cargo: 'GERENTE' });

    expect(repo.update).toHaveBeenCalledWith(
      1,
      { cargo: 'GERENTE', ativo: true, acessoFinanceiro: false },
      TX,
    );
  });

  it('concede permissão financeira só a gerentes', async () => {
    com({ id: 2, cargo: 'GERENTE', ativo: true, acessoFinanceiro: false }, [1]);
    await service.atualizarAcesso(2, { acessoFinanceiro: true });
    expect(repo.update).toHaveBeenLastCalledWith(
      2,
      { cargo: 'GERENTE', ativo: true, acessoFinanceiro: true },
      TX,
    );

    com(
      { id: 3, cargo: 'OPERADOR', ativo: true, acessoFinanceiro: false },
      [1],
    );
    await expect(
      service.atualizarAcesso(3, { acessoFinanceiro: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('ao deixar de ser gerente, a permissão financeira não fica guardada', async () => {
    com({ id: 2, cargo: 'GERENTE', ativo: true, acessoFinanceiro: true }, [1]);

    await service.atualizarAcesso(2, { cargo: 'OPERADOR' });

    expect(repo.update).toHaveBeenCalledWith(
      2,
      { cargo: 'OPERADOR', ativo: true, acessoFinanceiro: false },
      TX,
    );
  });

  it('usuário inexistente responde 404', async () => {
    com(null, [1]);
    await expect(
      service.atualizarAcesso(9, { ativo: false }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('createUsuarioSchema', () => {
  const base = {
    nome: 'Nova pessoa',
    email: 'nova@example.test',
    senha: 'senha-forte-de-teste-123',
  };

  it('cria sem permissão financeira por padrão', () => {
    expect(createUsuarioSchema.parse(base)).toMatchObject({
      cargo: 'OPERADOR',
      acessoFinanceiro: false,
    });
  });

  it('recusa permissão financeira fora do cargo de gerente', () => {
    expect(
      createUsuarioSchema.safeParse({ ...base, acessoFinanceiro: true })
        .success,
    ).toBe(false);
    expect(
      createUsuarioSchema.safeParse({
        ...base,
        cargo: 'GERENTE',
        acessoFinanceiro: true,
      }).success,
    ).toBe(true);
  });
});
