import { z } from 'zod';

export const MAX_MONEY = 9_999_999_999.99;
export const MAX_QUANTITY = 999_999_999.999;
export const moneySchema = z.coerce
  .number()
  .finite()
  .min(0)
  .max(MAX_MONEY)
  .multipleOf(0.01);
export const quantitySchema = z.coerce
  .number()
  .finite()
  .min(0)
  .max(MAX_QUANTITY)
  .multipleOf(0.001);
export const idSchema = z.coerce.number().int().positive().max(2_147_483_647);
export const newPasswordSchema = z
  .string()
  .min(12)
  .max(72)
  .refine(
    (value) => Buffer.byteLength(value, 'utf8') <= 72,
    'A senha deve ter no máximo 72 bytes UTF-8.',
  );
