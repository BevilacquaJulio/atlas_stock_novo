import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const loginSchema = z
  .object({
    email: z.string().trim().email().max(180),
    senha: z.string().min(1).max(1024),
  })
  .strict();
export class LoginDto extends createZodDto(loginSchema) {}

export const refreshSchema = z
  .object({
    refreshToken: z.string().min(10).max(2048),
  })
  .strict();
export class RefreshDto extends createZodDto(refreshSchema) {}
