import { z } from 'zod';

export const jwtPolicy = {
  issuer: 'atlas-stock',
  audience: 'atlas-stock-api',
  algorithms: ['HS256'] as ['HS256'],
};

/** Validade da confirmação de senha exigida nas ações críticas. */
export const REAUTENTICACAO_TTL_SEGUNDOS = 10 * 60;

const claims = {
  sub: z.number().int().positive(),
  exp: z.number().int().positive(),
};

export const accessClaimsSchema = z.object({ ...claims, purpose: z.literal('access') });
export const refreshClaimsSchema = z.object({
  ...claims, purpose: z.literal('refresh'), tokenId: z.number().int().positive(),
});
export const reautenticacaoClaimsSchema = z.object({
  ...claims, purpose: z.literal('reautenticacao'),
});
