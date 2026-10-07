import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const desbloquearSchema = z.object({
  senha: z.string().min(1),
});
export class DesbloquearDto extends createZodDto(desbloquearSchema) {}

export const createDespesaSchema = z.object({
  descricao: z.string().trim().min(1).max(200),
  valor: z.coerce.number().positive(),
  dataVencimento: z.coerce.date().optional().nullable(),
  fornecedorId: z.coerce.number().int().positive().optional().nullable(),
  categoriaDespesaId: z.coerce.number().int().positive().optional().nullable(),
  projetoId: z.coerce.number().int().positive().optional().nullable(),
});
export class CreateDespesaDto extends createZodDto(createDespesaSchema) {}
export type CreateDespesaInput = z.infer<typeof createDespesaSchema>;

export const updateDespesaSchema = createDespesaSchema.partial();
export class UpdateDespesaDto extends createZodDto(updateDespesaSchema) {}
export type UpdateDespesaInput = z.infer<typeof updateDespesaSchema>;

export const pagarDespesaSchema = z.object({
  dataPagamento: z.coerce.date().optional(),
});
export class PagarDespesaDto extends createZodDto(pagarDespesaSchema) {}

export const createReceitaSchema = z.object({
  descricao: z.string().trim().min(1).max(200),
  valor: z.coerce.number().positive(),
  dataVencimento: z.coerce.date().optional().nullable(),
  clienteId: z.coerce.number().int().positive().optional().nullable(),
  projetoId: z.coerce.number().int().positive().optional().nullable(),
});
export class CreateReceitaDto extends createZodDto(createReceitaSchema) {}
export type CreateReceitaInput = z.infer<typeof createReceitaSchema>;

export const updateReceitaSchema = createReceitaSchema.partial();
export class UpdateReceitaDto extends createZodDto(updateReceitaSchema) {}
export type UpdateReceitaInput = z.infer<typeof updateReceitaSchema>;

export const receberReceitaSchema = z.object({
  dataRecebimento: z.coerce.date().optional(),
});
export class ReceberReceitaDto extends createZodDto(receberReceitaSchema) {}

export const createCategoriaDespesaSchema = z.object({
  nome: z.string().trim().min(1).max(120),
  ativo: z.boolean().default(true),
});
export class CreateCategoriaDespesaDto extends createZodDto(
  createCategoriaDespesaSchema,
) {}
export type CreateCategoriaDespesaInput = z.infer<
  typeof createCategoriaDespesaSchema
>;

export const financeiroQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  status: z.string().optional(),
});
export class FinanceiroQueryDto extends createZodDto(financeiroQuerySchema) {}
export type FinanceiroQuery = z.infer<typeof financeiroQuerySchema>;
