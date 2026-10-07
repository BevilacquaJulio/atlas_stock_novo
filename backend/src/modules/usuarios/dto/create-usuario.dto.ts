import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createUsuarioSchema = z.object({
  nome: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(180),
  senha: z.string().min(6).max(72),
  cargo: z.enum(['ADMINISTRADOR', 'GERENTE', 'OPERADOR']).default('OPERADOR'),
});

export type CreateUsuarioInput = z.infer<typeof createUsuarioSchema>;

export class CreateUsuarioDto extends createZodDto(createUsuarioSchema) {}
