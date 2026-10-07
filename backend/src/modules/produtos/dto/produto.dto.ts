import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createProdutoSchema = z
  .object({
    codigo: z.string().trim().min(1).max(60),
    nome: z.string().trim().min(2).max(200),
    descricao: z.string().trim().max(2000).optional().nullable(),
    categoriaId: z.coerce.number().int().positive().optional().nullable(),
    unidadeMedida: z.string().trim().min(1).max(20),
    valorUnitario: z.coerce.number().min(0).default(0),
    estoqueInicial: z.coerce.number().min(0).default(0),
    escopo: z.enum(['GERAL', 'PROJETO']).default('GERAL'),
    projetoId: z.coerce.number().int().positive().optional().nullable(),
    ativo: z.boolean().default(true),
  })
  .refine((d) => d.escopo === 'PROJETO' || d.categoriaId != null, {
    message: 'Categoria é obrigatória para produtos de escopo GERAL.',
    path: ['categoriaId'],
  });
export class CreateProdutoDto extends createZodDto(createProdutoSchema) {}

// Update: estoque não é alterado por aqui (usa movimentações).
export const updateProdutoSchema = z.object({
  codigo: z.string().trim().min(1).max(60).optional(),
  nome: z.string().trim().min(2).max(200).optional(),
  descricao: z.string().trim().max(2000).optional().nullable(),
  categoriaId: z.coerce.number().int().positive().optional().nullable(),
  unidadeMedida: z.string().trim().min(1).max(20).optional(),
  valorUnitario: z.coerce.number().min(0).optional(),
  escopo: z.enum(['GERAL', 'PROJETO']).optional(),
  projetoId: z.coerce.number().int().positive().optional().nullable(),
  ativo: z.boolean().optional(),
});
export class UpdateProdutoDto extends createZodDto(updateProdutoSchema) {}

export type CreateProdutoInput = z.infer<typeof createProdutoSchema>;
export type UpdateProdutoInput = z.infer<typeof updateProdutoSchema>;
