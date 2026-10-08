import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { newPasswordSchema } from '../../../common/validators/bounds';

export const createUsuarioSchema = z
  .object({
    nome: z.string().trim().min(2).max(150),
    email: z.string().trim().email().max(180),
    senha: newPasswordSchema,
    cargo: z.enum(['ADMINISTRADOR', 'GERENTE', 'OPERADOR']).default('OPERADOR'),
  })
  .strict();

export type CreateUsuarioInput = z.infer<typeof createUsuarioSchema>;

export class CreateUsuarioDto extends createZodDto(createUsuarioSchema) {}
