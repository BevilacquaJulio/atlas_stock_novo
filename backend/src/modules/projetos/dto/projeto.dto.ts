import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const projetoStatusSchema = z.enum([
  'AGUARDANDO',
  'EM_ANDAMENTO',
  'CONCLUIDO',
  'CANCELADO',
]);

export const createProjetoSchema = z.object({
  clienteId: z.coerce.number().int().positive(),
  veiculoId: z.coerce.number().int().positive(),
  descricao: z.string().trim().max(2000).optional().nullable(),
  valorOrcado: z.coerce.number().min(0).default(0),
  checklistInicial: z.array(z.string().trim().min(1).max(300)).optional(),
});
export class CreateProjetoDto extends createZodDto(createProjetoSchema) {}
export type CreateProjetoInput = z.infer<typeof createProjetoSchema>;

export const updateProjetoSchema = z.object({
  descricao: z.string().trim().max(2000).optional().nullable(),
  valorOrcado: z.coerce.number().min(0).optional(),
  valorFinal: z.coerce.number().min(0).optional().nullable(),
});
export class UpdateProjetoDto extends createZodDto(updateProjetoSchema) {}
export type UpdateProjetoInput = z.infer<typeof updateProjetoSchema>;

export const alterarStatusProjetoSchema = z.object({
  status: projetoStatusSchema,
  observacao: z.string().trim().max(2000).optional().nullable(),
});
export class AlterarStatusProjetoDto extends createZodDto(
  alterarStatusProjetoSchema,
) {}
export type AlterarStatusProjetoInput = z.infer<
  typeof alterarStatusProjetoSchema
>;

export const createChecklistItemSchema = z.object({
  descricao: z.string().trim().min(1).max(300),
  ordem: z.coerce.number().int().min(0).optional(),
});
export class CreateChecklistItemDto extends createZodDto(
  createChecklistItemSchema,
) {}
export type CreateChecklistItemInput = z.infer<typeof createChecklistItemSchema>;

export const updateChecklistItemSchema = z.object({
  descricao: z.string().trim().min(1).max(300).optional(),
  concluido: z.boolean().optional(),
  ordem: z.coerce.number().int().min(0).optional(),
});
export class UpdateChecklistItemDto extends createZodDto(
  updateChecklistItemSchema,
) {}
export type UpdateChecklistItemInput = z.infer<
  typeof updateChecklistItemSchema
>;

export const createConsumoSchema = z
  .object({
    tipo: z.enum(['PRODUTO', 'SERVICO']),
    produtoId: z.coerce.number().int().positive().optional(),
    descricao: z.string().trim().max(200).optional().nullable(),
    quantidade: z.coerce.number().positive(),
    valorUnitario: z.coerce.number().min(0),
  })
  .refine(
    (d) =>
      d.tipo === 'SERVICO'
        ? !!d.descricao?.trim()
        : d.produtoId != null && d.produtoId > 0,
    {
      message:
        'Produto é obrigatório para consumo de produto; descrição para serviço.',
      path: ['produtoId'],
    },
  );
export class CreateConsumoDto extends createZodDto(createConsumoSchema) {}
export type CreateConsumoInput = z.infer<typeof createConsumoSchema>;

export const projetoQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  status: projetoStatusSchema.optional(),
  clienteId: z.coerce.number().int().positive().optional(),
  ativo: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});
export class ProjetoQueryDto extends createZodDto(projetoQuerySchema) {}
export type ProjetoQuery = z.infer<typeof projetoQuerySchema>;
