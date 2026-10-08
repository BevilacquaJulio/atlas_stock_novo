import {
  idSchema,
  moneySchema,
  quantitySchema,
  MAX_MONEY,
} from '../../../common/validators/bounds';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const compraItemSchema = z
  .object({
    produtoId: idSchema,
    quantidade: quantitySchema.positive(),
    valorUnitario: moneySchema,
  })
  .strict()
  .refine((item) => item.quantidade * item.valorUnitario <= MAX_MONEY, {
    message: 'Valor do item excede o limite permitido.',
    path: ['valorUnitario'],
  });

export const createCompraSchema = z
  .object({
    fornecedorId: idSchema,
    dataCompra: z.coerce.date().optional(),
    observacoes: z.string().trim().max(2000).optional().nullable(),
    itens: z
      .array(compraItemSchema)
      .min(1, 'Informe ao menos um item.')
      .max(100),
  })
  .strict()
  .refine(
    (compra) =>
      compra.itens.reduce(
        (total, item) => total + item.quantidade * item.valorUnitario,
        0,
      ) <= MAX_MONEY,
    {
      message: 'Total da compra excede o limite permitido.',
      path: ['itens'],
    },
  );
export class CreateCompraDto extends createZodDto(createCompraSchema) {}
export type CreateCompraInput = z.infer<typeof createCompraSchema>;

export const pagarCompraSchema = z
  .object({
    dataPagamento: z.coerce.date().optional(),
  })
  .strict();
export class PagarCompraDto extends createZodDto(pagarCompraSchema) {}
export type PagarCompraInput = z.infer<typeof pagarCompraSchema>;

export const compraQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(200).optional(),
    status: z.enum(['A_PAGAR', 'CONFIRMADA', 'PAGO', 'CANCELADA']).optional(),
    fornecedorId: idSchema.optional(),
  })
  .strict();
export class CompraQueryDto extends createZodDto(compraQuerySchema) {}
export type CompraQuery = z.infer<typeof compraQuerySchema>;
