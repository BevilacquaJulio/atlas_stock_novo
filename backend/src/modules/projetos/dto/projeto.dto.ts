import {
  idSchema,
  moneySchema,
  quantitySchema,
  MAX_MONEY,
} from '../../../common/validators/bounds';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const projetoStatusSchema = z.enum([
  'AGUARDANDO',
  'EM_ANDAMENTO',
  'CONCLUIDO',
  'CANCELADO',
]);

export const createProjetoSchema = z
  .object({
    clienteId: idSchema,
    veiculoId: idSchema,
    descricao: z.string().trim().max(2000).optional().nullable(),
    valorOrcado: moneySchema.default(0),
    checklistInicial: z
      .array(z.string().trim().min(1).max(300))
      .max(100)
      .optional(),
  })
  .strict();
export class CreateProjetoDto extends createZodDto(createProjetoSchema) {}
export type CreateProjetoInput = z.infer<typeof createProjetoSchema>;

export const updateProjetoSchema = z
  .object({
    descricao: z.string().trim().max(2000).optional().nullable(),
    valorOrcado: moneySchema.optional(),
    valorFinal: moneySchema.optional().nullable(),
  })
  .strict();
export class UpdateProjetoDto extends createZodDto(updateProjetoSchema) {}
export type UpdateProjetoInput = z.infer<typeof updateProjetoSchema>;

export const alterarStatusProjetoSchema = z
  .object({
    status: projetoStatusSchema,
    observacao: z.string().trim().max(2000).optional().nullable(),
  })
  .strict();
export class AlterarStatusProjetoDto extends createZodDto(
  alterarStatusProjetoSchema,
) {}
export type AlterarStatusProjetoInput = z.infer<
  typeof alterarStatusProjetoSchema
>;

export const createChecklistItemSchema = z
  .object({
    descricao: z.string().trim().min(1).max(300),
    ordem: z.coerce.number().int().min(0).max(100_000).optional(),
  })
  .strict();
export class CreateChecklistItemDto extends createZodDto(
  createChecklistItemSchema,
) {}
export type CreateChecklistItemInput = z.infer<
  typeof createChecklistItemSchema
>;

export const updateChecklistItemSchema = z
  .object({
    descricao: z.string().trim().min(1).max(300).optional(),
    concluido: z.boolean().optional(),
    ordem: z.coerce.number().int().min(0).max(100_000).optional(),
  })
  .strict();
export class UpdateChecklistItemDto extends createZodDto(
  updateChecklistItemSchema,
) {}
export type UpdateChecklistItemInput = z.infer<
  typeof updateChecklistItemSchema
>;

export const createConsumoSchema = z
  .object({
    tipo: z.enum(['PRODUTO', 'SERVICO']),
    produtoId: idSchema.optional(),
    descricao: z.string().trim().max(200).optional().nullable(),
    quantidade: quantitySchema.positive(),
    valorUnitario: moneySchema,
  })
  .strict()
  .refine(
    (consumo) => consumo.quantidade * consumo.valorUnitario <= MAX_MONEY,
    {
      message: 'Valor do consumo excede o limite permitido.',
      path: ['valorUnitario'],
    },
  )
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

export const projetoQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(200).optional(),
    status: projetoStatusSchema.optional(),
    clienteId: idSchema.optional(),
    ativo: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
  })
  .strict();
export class ProjetoQueryDto extends createZodDto(projetoQuerySchema) {}
export type ProjetoQuery = z.infer<typeof projetoQuerySchema>;
