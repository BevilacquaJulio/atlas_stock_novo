import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { newPasswordSchema } from '../../../common/validators/bounds';

const cargoSchema = z.enum(['ADMINISTRADOR', 'GERENTE', 'OPERADOR']);

/** A permissão financeira explícita só existe para gerentes. */
const MENSAGEM_ACESSO_FINANCEIRO =
  'A permissão financeira só se aplica a gerentes; administradores já têm acesso.';

export const createUsuarioSchema = z
  .object({
    nome: z.string().trim().min(2).max(150),
    email: z.string().trim().email().max(180),
    senha: newPasswordSchema,
    cargo: cargoSchema.default('OPERADOR'),
    acessoFinanceiro: z.boolean().default(false),
  })
  .strict()
  .refine((d) => !d.acessoFinanceiro || d.cargo === 'GERENTE', {
    message: MENSAGEM_ACESSO_FINANCEIRO,
    path: ['acessoFinanceiro'],
  });

export type CreateUsuarioInput = z.infer<typeof createUsuarioSchema>;

export class CreateUsuarioDto extends createZodDto(createUsuarioSchema) {}

export const updateAcessoUsuarioSchema = z
  .object({
    cargo: cargoSchema.optional(),
    ativo: z.boolean().optional(),
    acessoFinanceiro: z.boolean().optional(),
  })
  .strict()
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: 'Informe ao menos um campo para alterar.',
  });

export type UpdateAcessoUsuarioInput = z.infer<
  typeof updateAcessoUsuarioSchema
>;

export class UpdateAcessoUsuarioDto extends createZodDto(
  updateAcessoUsuarioSchema,
) {}

export { MENSAGEM_ACESSO_FINANCEIRO };
