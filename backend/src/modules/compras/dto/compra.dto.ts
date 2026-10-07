import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const compraItemSchema = z.object({
  produtoId: z.coerce.number().int().positive(),
  quantidade: z.coerce.number().positive(),
  valorUnitario: z.coerce.number().min(0),
});

export const createCompraSchema = z.object({
  fornecedorId: z.coerce.number().int().positive(),
  dataCompra: z.coerce.date().optional(),
  observacoes: z.string().trim().max(2000).optional().nullable(),
  itens: z.array(compraItemSchema).min(1, 'Informe ao menos um item.'),
});
export class CreateCompraDto extends createZodDto(createCompraSchema) {}
export type CreateCompraInput = z.infer<typeof createCompraSchema>;

export const pagarCompraSchema = z.object({
  dataPagamento: z.coerce.date().optional(),
});
export class PagarCompraDto extends createZodDto(pagarCompraSchema) {}
export type PagarCompraInput = z.infer<typeof pagarCompraSchema>;

export const compraQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(['A_PAGAR', 'CONFIRMADA', 'PAGO', 'CANCELADA']).optional(),
  fornecedorId: z.coerce.number().int().positive().optional(),
});
export class CompraQueryDto extends createZodDto(compraQuerySchema) {}
export type CompraQuery = z.infer<typeof compraQuerySchema>;
