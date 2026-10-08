import { describe, expect, it } from 'vitest';
import { createCompraSchema } from '../../modules/compras/dto/compra.dto';
import {
  createProjetoSchema,
  createConsumoSchema,
} from '../../modules/projetos/dto/projeto.dto';
import { createUsuarioSchema } from '../../modules/usuarios/dto/create-usuario.dto';
import {
  createProdutoSchema,
  updateProdutoSchema,
} from '../../modules/produtos/dto/produto.dto';
import { paginationSchema } from '../dto/pagination.dto';
import { ParseIdPipe } from '../pipes/parse-id.pipe';
import { moneySchema, quantitySchema, MAX_MONEY, MAX_QUANTITY } from './bounds';

describe('contratos de entrada', () => {
  it('preserva valores representáveis e recusa overflow ou precisão excessiva', () => {
    for (const value of [0, 0.01, 12.34, MAX_MONEY])
      expect(moneySchema.parse(value)).toBe(value);
    for (const value of [0, 0.001, 12.345, MAX_QUANTITY])
      expect(quantitySchema.parse(value)).toBe(value);
    for (const value of [-1, Infinity, NaN, 0.001, MAX_MONEY + 1])
      expect(moneySchema.safeParse(value).success).toBe(false);
    expect(quantitySchema.safeParse(0.0001).success).toBe(false);
    expect(quantitySchema.safeParse(MAX_QUANTITY + 1).success).toBe(false);
  });

  it('limita itens, checklist e totais acumulados antes de consultar o banco', () => {
    const item = { produtoId: 1, quantidade: 1, valorUnitario: 5 };
    expect(
      createCompraSchema.safeParse({ fornecedorId: 1, itens: [item] }).success,
    ).toBe(true);
    expect(
      createCompraSchema.safeParse({
        fornecedorId: 1,
        itens: Array(101).fill(item),
      }).success,
    ).toBe(false);
    expect(
      createCompraSchema.safeParse({
        fornecedorId: 1,
        itens: [item, { ...item, valorUnitario: MAX_MONEY }],
      }).success,
    ).toBe(false);
    expect(
      createCompraSchema.safeParse({
        fornecedorId: 1,
        itens: [{ ...item, quantidade: 2, valorUnitario: MAX_MONEY }],
      }).success,
    ).toBe(false);
    expect(
      createProjetoSchema.safeParse({
        clienteId: 1,
        veiculoId: 1,
        checklistInicial: Array(101).fill('Verificar'),
      }).success,
    ).toBe(false);
    expect(
      createConsumoSchema.safeParse({
        tipo: 'SERVICO',
        descricao: 'Serviço',
        quantidade: 2,
        valorUnitario: MAX_MONEY,
      }).success,
    ).toBe(false);
  });

  it('não aceita mass assignment nem edição de estoque no cadastro', () => {
    const product = {
      codigo: 'OK',
      nome: 'Produto',
      categoriaId: 1,
      unidadeMedida: 'un',
      estoqueInicial: 1,
      valorUnitario: 5,
    };
    expect(createProdutoSchema.safeParse(product).success).toBe(true);
    expect(
      createProdutoSchema.safeParse({ ...product, quantidadeEstoque: 50 })
        .success,
    ).toBe(false);
    expect(updateProdutoSchema.safeParse({ estoqueInicial: 50 }).success).toBe(
      false,
    );
    expect(
      createCompraSchema.safeParse({
        fornecedorId: 1,
        itens: [
          { produtoId: 1, quantidade: 1, valorUnitario: 5, status: 'PAGO' },
        ],
      }).success,
    ).toBe(false);
  });

  it('limita senhas novas pelos bytes que o bcrypt realmente compara', () => {
    const user = {
      nome: 'Teste',
      email: 'teste@example.com',
      senha: 'a'.repeat(72),
    };
    expect(createUsuarioSchema.safeParse(user).success).toBe(true);
    expect(
      createUsuarioSchema.safeParse({ ...user, senha: 'á'.repeat(36) }).success,
    ).toBe(true);
    expect(
      createUsuarioSchema.safeParse({ ...user, senha: 'á'.repeat(37) }).success,
    ).toBe(false);
    expect(
      createUsuarioSchema.safeParse({ ...user, senha: 'a'.repeat(11) }).success,
    ).toBe(false);
  });

  it('recusa paginação excessiva, buscas longas e IDs fora do INT positivo', () => {
    expect(paginationSchema.safeParse({ page: '100001' }).success).toBe(false);
    expect(
      paginationSchema.safeParse({ search: 'a'.repeat(201) }).success,
    ).toBe(false);
    const pipe = new ParseIdPipe();
    expect(pipe.transform('2147483647')).toBe(2147483647);
    for (const value of ['0', '-1', '2147483648', '1.5', '1x', '1e2'])
      expect(() => pipe.transform(value)).toThrow();
  });
});
