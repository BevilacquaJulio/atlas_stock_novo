import {
  idSchema,
  moneySchema,
  quantitySchema,
  MAX_MONEY,
} from '../../../common/validators/bounds';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createMovimentacaoSchema = z
  .object({
    produtoId: idSchema,
    tipo: z.enum(['ENTRADA', 'SAIDA']),
    quantidade: quantitySchema.positive(),
    custoUnitario: moneySchema.optional(),
    motivo: z.string().trim().max(200).optional().nullable(),
  })
  .strict()
  .refine(
    (movimento) =>
      movimento.custoUnitario === undefined ||
      movimento.quantidade * movimento.custoUnitario <= MAX_MONEY,
    {
      message: 'Valor da movimentação excede o limite permitido.',
      path: ['custoUnitario'],
    },
  );
export class CreateMovimentacaoDto extends createZodDto(
  createMovimentacaoSchema,
) {}

export type CreateMovimentacaoInput = z.infer<typeof createMovimentacaoSchema>;

export const movimentacaoQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    produtoId: idSchema.optional(),
    tipo: z.enum(['ENTRADA', 'SAIDA']).optional(),
  })
  .strict();
export class MovimentacaoQueryDto extends createZodDto(
  movimentacaoQuerySchema,
) {}

export type MovimentacaoQuery = z.infer<typeof movimentacaoQuerySchema>;
