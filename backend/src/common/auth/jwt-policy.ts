import { z } from 'zod';

export const jwtPolicy = {
  issuer: 'atlas-stock',
  audience: 'atlas-stock-api',
  algorithms: ['HS256'] as ['HS256'],
};

const claims = {
  sub: z.number().int().positive(),
  exp: z.number().int().positive(),
};

export const accessClaimsSchema = z.object({ ...claims, purpose: z.literal('access') });
export const refreshClaimsSchema = z.object({
  ...claims, purpose: z.literal('refresh'), tokenId: z.number().int().positive(),
});
