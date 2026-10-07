import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email(),
  senha: z.string().min(1),
});
export class LoginDto extends createZodDto(loginSchema) {}

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});
export class RefreshDto extends createZodDto(refreshSchema) {}
