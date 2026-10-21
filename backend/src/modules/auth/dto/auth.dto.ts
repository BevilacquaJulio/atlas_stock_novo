import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { newPasswordSchema } from '../../../common/validators/bounds';

export const loginSchema = z
  .object({
    email: z.string().trim().email().max(180),
    senha: z.string().min(1).max(1024),
  })
  .strict();
export class LoginDto extends createZodDto(loginSchema) {}

export const refreshSchema = z.object({}).strict().default({});
export class RefreshDto extends createZodDto(refreshSchema) {}

export const reautenticarSchema = z
  .object({
    senha: z.string().min(1).max(1024),
  })
  .strict();
export class ReautenticarDto extends createZodDto(reautenticarSchema) {}

export class ChangePasswordDto extends createZodDto(
  z
    .object({
      senhaAtual: z.string().min(1).max(1024),
      novaSenha: newPasswordSchema,
    })
    .strict(),
) {}
export class RecoverPasswordDto extends createZodDto(
  z
    .object({
      token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
      novaSenha: newPasswordSchema,
    })
    .strict(),
) {}
