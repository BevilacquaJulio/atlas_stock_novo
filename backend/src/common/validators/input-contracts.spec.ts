import { describe, expect, it } from 'vitest';
import { loginSchema, refreshSchema } from '../../modules/auth/dto/auth.dto';
import {
  createClienteSchema,
  updateClienteSchema,
} from '../../modules/clientes/dto/cliente.dto';
import {
  createFornecedorSchema,
  updateFornecedorSchema,
} from '../../modules/fornecedores/dto/fornecedor.dto';
import {
  createVeiculoSchema,
  updateVeiculoSchema,
  veiculoQuerySchema,
} from '../../modules/veiculos/dto/veiculo.dto';
import {
  createCategoriaSchema,
  updateCategoriaSchema,
} from '../../modules/categorias/dto/categoria.dto';
import * as financeiro from '../../modules/financeiro/dto/financeiro.dto';
import {
  createMovimentacaoSchema,
  movimentacaoQuerySchema,
} from '../../modules/movimentacoes/dto/movimentacao.dto';
import { MAX_MONEY } from './bounds';

describe('contratos de autenticação e cadastros', () => {
  it('normaliza email e limita credenciais sem aceitar campos adicionais', () => {
    expect(
      loginSchema.parse({ email: ' user@example.test ', senha: 'pass' }).email,
    ).toBe('user@example.test');
    for (const input of [
      { email: 'inválido', senha: 'pass' },
      { email: 'user@example.test', senha: '' },
      { email: 'user@example.test', senha: 'x'.repeat(1025) },
      { email: 'user@example.test', senha: 'pass', cargo: 'ADMINISTRADOR' },
    ])
      expect(loginSchema.safeParse(input).success).toBe(false);
    expect(
      refreshSchema.parse({ refreshToken: 'x'.repeat(2048) }).refreshToken,
    ).toHaveLength(2048);
    for (const token of ['', 'short', 'x'.repeat(2049)])
      expect(refreshSchema.safeParse({ refreshToken: token }).success).toBe(
        false,
      );
  });

  it('valida documentos e normaliza dados de clientes e fornecedores', () => {
    const client = {
      nomeCompleto: ' Cliente ',
      cpfCnpj: '529.982.247-25',
      telefone: '(11) 99999-0000',
    };
    expect(createClienteSchema.parse(client)).toMatchObject({
      nomeCompleto: 'Cliente',
      cpfCnpj: '52998224725',
      telefone: '11999990000',
      ativo: true,
      tipo: 'PF',
    });
    const supplier = {
      nomeRazaoSocial: ' Empresa ',
      cpfCnpj: '04.252.011/0001-10',
    };
    expect(createFornecedorSchema.parse(supplier)).toMatchObject({
      nomeRazaoSocial: 'Empresa',
      cpfCnpj: '04252011000110',
      ativo: true,
    });
    for (const cpfCnpj of ['11111111111', '123', 'x'.repeat(31)]) {
      expect(
        createClienteSchema.safeParse({ ...client, cpfCnpj }).success,
      ).toBe(false);
      expect(
        createFornecedorSchema.safeParse({ ...supplier, cpfCnpj }).success,
      ).toBe(false);
    }
    expect(
      createClienteSchema.safeParse({ ...client, estado: 'SPX' }).success,
    ).toBe(false);
    expect(
      createFornecedorSchema.safeParse({ ...supplier, email: 'inválido' })
        .success,
    ).toBe(false);
    expect(updateClienteSchema.parse({ observacoes: null })).toEqual({
      observacoes: null,
    });
    expect(updateFornecedorSchema.parse({ ativo: false })).toEqual({
      ativo: false,
    });
    expect(updateClienteSchema.safeParse({ id: 1 }).success).toBe(false);
    expect(updateFornecedorSchema.safeParse({ id: 1 }).success).toBe(false);
  });

  it('normaliza placa e exige vínculo válido sem aceitar campos internos', () => {
    const vehicle = {
      clienteId: 1,
      placa: ' abc1234 ',
      marca: ' Marca ',
      modelo: ' Modelo ',
    };
    expect(createVeiculoSchema.parse(vehicle)).toMatchObject({
      placa: 'ABC1234',
      marca: 'Marca',
      modelo: 'Modelo',
      ativo: true,
    });
    expect(
      createVeiculoSchema.safeParse({ ...vehicle, clienteId: 0 }).success,
    ).toBe(false);
    expect(
      createVeiculoSchema.safeParse({ ...vehicle, placa: 'x'.repeat(11) })
        .success,
    ).toBe(false);
    expect(updateVeiculoSchema.parse({ cor: null })).toEqual({ cor: null });
    expect(updateVeiculoSchema.safeParse({ id: 1 }).success).toBe(false);
    expect(
      veiculoQuerySchema.parse({ ativo: 'false', clienteId: '2' }),
    ).toMatchObject({ ativo: false, clienteId: 2, page: 1, limit: 20 });
    expect(veiculoQuerySchema.parse({ ativo: 'true' }).ativo).toBe(true);
    expect(veiculoQuerySchema.safeParse({ ativo: 'yes' }).success).toBe(false);
  });

  it('limita categorias e permite atualização parcial sem alterar campos omitidos', () => {
    expect(createCategoriaSchema.parse({ nome: ' Peças ' })).toEqual({
      nome: 'Peças',
      ativo: true,
    });
    expect(updateCategoriaSchema.parse({ descricao: null })).toEqual({
      descricao: null,
    });
    expect(
      createCategoriaSchema.safeParse({ nome: 'x'.repeat(121) }).success,
    ).toBe(false);
    expect(updateCategoriaSchema.safeParse({ id: 1 }).success).toBe(false);
  });
});

describe('contratos financeiros e de estoque', () => {
  it.each([financeiro.createDespesaSchema, financeiro.createReceitaSchema])(
    'aceita dinheiro representável e datas válidas, mas não status arbitrário',
    (schema) => {
      expect(
        schema.parse({
          descricao: ' Conta ',
          valor: 12.34,
          dataVencimento: '2026-10-08',
        }),
      ).toMatchObject({
        descricao: 'Conta',
        valor: 12.34,
        dataVencimento: new Date('2026-10-08'),
      });
      for (const valor of [0, -1, 0.001, MAX_MONEY + 1])
        expect(schema.safeParse({ descricao: 'Conta', valor }).success).toBe(
          false,
        );
      expect(
        schema.safeParse({ descricao: 'Conta', valor: 1, status: 'PAGO' })
          .success,
      ).toBe(false);
      expect(
        schema.safeParse({
          descricao: 'Conta',
          valor: 1,
          dataVencimento: 'inválida',
        }).success,
      ).toBe(false);
    },
  );

  it('atualiza parcialmente e restringe comandos de quitação e desbloqueio', () => {
    expect(
      financeiro.updateDespesaSchema.parse({ fornecedorId: null }),
    ).toEqual({ fornecedorId: null });
    expect(financeiro.updateReceitaSchema.parse({ clienteId: null })).toEqual({
      clienteId: null,
    });
    expect(
      financeiro.pagarDespesaSchema.parse({ dataPagamento: '2026-10-08' }),
    ).toEqual({ dataPagamento: new Date('2026-10-08') });
    expect(
      financeiro.receberReceitaSchema.parse({ dataRecebimento: '2026-10-08' }),
    ).toEqual({ dataRecebimento: new Date('2026-10-08') });
    expect(financeiro.pagarDespesaSchema.safeParse({ valor: 1 }).success).toBe(
      false,
    );
    expect(
      financeiro.receberReceitaSchema.safeParse({ valor: 1 }).success,
    ).toBe(false);
    expect(financeiro.desbloquearSchema.parse({ senha: 'pass' })).toEqual({
      senha: 'pass',
    });
    expect(financeiro.desbloquearSchema.safeParse({ senha: '' }).success).toBe(
      false,
    );
    expect(
      financeiro.createCategoriaDespesaSchema.parse({ nome: ' Taxas ' }),
    ).toEqual({ nome: 'Taxas', ativo: true });
    expect(
      financeiro.createCategoriaDespesaSchema.safeParse({ nome: ' ' }).success,
    ).toBe(false);
  });

  it('recusa overflow de valor total da movimentação', () => {
    const input = { produtoId: 1, tipo: 'ENTRADA', quantidade: 2 };
    expect(createMovimentacaoSchema.parse(input)).toEqual(input);
    expect(
      createMovimentacaoSchema.parse({ ...input, custoUnitario: 10 })
        .custoUnitario,
    ).toBe(10);
    expect(
      createMovimentacaoSchema.safeParse({ ...input, custoUnitario: MAX_MONEY })
        .success,
    ).toBe(false);
    expect(
      createMovimentacaoSchema.safeParse({ ...input, quantidade: 0 }).success,
    ).toBe(false);
    expect(
      createMovimentacaoSchema.safeParse({ ...input, usuarioId: 1 }).success,
    ).toBe(false);
  });

  it.each([
    financeiro.financeiroQuerySchema,
    movimentacaoQuerySchema,
    veiculoQuerySchema,
  ])('limita paginação e rejeita parâmetros desconhecidos', (schema) => {
    expect(schema.parse({ page: '2', limit: '10' })).toMatchObject({
      page: 2,
      limit: 10,
    });
    for (const input of [
      { page: 100001 },
      { limit: 101 },
      { page: 0 },
      { sortBy: 'senha' },
    ])
      expect(schema.safeParse(input).success).toBe(false);
  });
});
