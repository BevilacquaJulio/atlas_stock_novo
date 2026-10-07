import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createMovimentacaoSchema = z.object({
  produtoId: z.coerce.number().int().positive(),
  tipo: z.enum(['ENTRADA', 'SAIDA']),
  quantidade: z.coerce.number().positive(),
  custoUnitario: z.coerce.number().min(0).optional(),
  motivo: z.string().trim().max(200).optional().nullable(),
});
export class CreateMovimentacaoDto extends createZodDto(
  createMovimentacaoSchema,
) {}

export type CreateMovimentacaoInput = z.infer<typeof createMovimentacaoSchema>;

export const movimentacaoQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  produtoId: z.coerce.number().int().positive().optional(),
  tipo: z.enum(['ENTRADA', 'SAIDA']).optional(),
});
export class MovimentacaoQueryDto extends createZodDto(
  movimentacaoQuerySchema,
) {}

export type MovimentacaoQuery = z.infer<typeof movimentacaoQuerySchema>;
