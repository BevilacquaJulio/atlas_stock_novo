import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createCategoriaSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  descricao: z.string().trim().max(2000).optional().nullable(),
  ativo: z.boolean().default(true),
});
export class CreateCategoriaDto extends createZodDto(createCategoriaSchema) {}

export const updateCategoriaSchema = createCategoriaSchema.partial();
export class UpdateCategoriaDto extends createZodDto(updateCategoriaSchema) {}

export type CreateCategoriaInput = z.infer<typeof createCategoriaSchema>;
export type UpdateCategoriaInput = z.infer<typeof updateCategoriaSchema>;
