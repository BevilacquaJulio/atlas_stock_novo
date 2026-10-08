import { idSchema, moneySchema } from '../../../common/validators/bounds';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const desbloquearSchema = z
  .object({
    senha: z.string().min(1).max(1024),
  })
  .strict();
export class DesbloquearDto extends createZodDto(desbloquearSchema) {}

export const createDespesaSchema = z
  .object({
    descricao: z.string().trim().min(1).max(200),
    valor: moneySchema.positive(),
    dataVencimento: z.coerce.date().optional().nullable(),
    fornecedorId: idSchema.optional().nullable(),
    categoriaDespesaId: idSchema.optional().nullable(),
    projetoId: idSchema.optional().nullable(),
  })
  .strict();
export class CreateDespesaDto extends createZodDto(createDespesaSchema) {}
export type CreateDespesaInput = z.infer<typeof createDespesaSchema>;

export const updateDespesaSchema = createDespesaSchema.partial();
export class UpdateDespesaDto extends createZodDto(updateDespesaSchema) {}
export type UpdateDespesaInput = z.infer<typeof updateDespesaSchema>;

export const pagarDespesaSchema = z
  .object({
    dataPagamento: z.coerce.date().optional(),
  })
  .strict();
export class PagarDespesaDto extends createZodDto(pagarDespesaSchema) {}

export const createReceitaSchema = z
  .object({
    descricao: z.string().trim().min(1).max(200),
    valor: moneySchema.positive(),
    dataVencimento: z.coerce.date().optional().nullable(),
    clienteId: idSchema.optional().nullable(),
    projetoId: idSchema.optional().nullable(),
  })
  .strict();
export class CreateReceitaDto extends createZodDto(createReceitaSchema) {}
export type CreateReceitaInput = z.infer<typeof createReceitaSchema>;

export const updateReceitaSchema = createReceitaSchema.partial();
export class UpdateReceitaDto extends createZodDto(updateReceitaSchema) {}
export type UpdateReceitaInput = z.infer<typeof updateReceitaSchema>;

export const receberReceitaSchema = z
  .object({
    dataRecebimento: z.coerce.date().optional(),
  })
  .strict();
export class ReceberReceitaDto extends createZodDto(receberReceitaSchema) {}

export const createCategoriaDespesaSchema = z
  .object({
    nome: z.string().trim().min(1).max(120),
    ativo: z.boolean().default(true),
  })
  .strict();
export class CreateCategoriaDespesaDto extends createZodDto(
  createCategoriaDespesaSchema,
) {}
export type CreateCategoriaDespesaInput = z.infer<
  typeof createCategoriaDespesaSchema
>;

export const financeiroQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(200).optional(),
    status: z
      .enum(['A_PAGAR', 'PAGO', 'CANCELADA', 'A_RECEBER', 'RECEBIDO'])
      .optional(),
  })
  .strict();
export class FinanceiroQueryDto extends createZodDto(financeiroQuerySchema) {}
export type FinanceiroQuery = z.infer<typeof financeiroQuerySchema>;
