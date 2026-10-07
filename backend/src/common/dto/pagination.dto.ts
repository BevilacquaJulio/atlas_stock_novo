import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/** Convenção de paginação: ?page (>=1) & ?limit (1..100) + busca opcional. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  ativo: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

export class PaginationQueryDto extends createZodDto(paginationSchema) {}

/** Envelope padrão de resposta paginada. */
export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export function buildPaginated<T>(
  data: T[],
  total: number,
  { page, limit }: { page: number; limit: number },
): Paginated<T> {
  return { data, total, page, limit };
}
