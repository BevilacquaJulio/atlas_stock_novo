import { z } from 'zod';

const duration = (min: number, max: number) =>
  z
    .string()
    .regex(/^\d+[smhd]$/)
    .refine((value) => {
      const amount = Number(value.slice(0, -1));
      const seconds =
        amount * ({ s: 1, m: 60, h: 3600, d: 86400 }[value.slice(-1)] ?? 0);
      return seconds >= min && seconds <= max;
    }, `Duração deve estar entre ${min} e ${max} segundos.`);

/**
 * Schema Zod para process.env. Validado no boot (app.module) — falha rápido
 * se faltar/estiver inválida qualquer variável obrigatória.
 */
export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().max(65535).default(3000),

    // Banco de dados MySQL
    MYSQL_HOST: z.string().min(1),
    MYSQL_PORT: z.coerce.number().int().positive().max(65535).default(3306),
    MYSQL_USER: z.string().min(1),
    MYSQL_PASSWORD: z.string().default(''),
    MYSQL_DATABASE: z.string().min(1),
    MYSQL_SSL: z.enum(['true', 'false']).default('false'),
    MYSQL_SSL_REJECT_UNAUTHORIZED: z.enum(['true', 'false']).default('true'),
    MYSQL_SSL_CA_PATH: z.string().optional(),

    // JWT — segredos distintos para access e refresh
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRES_IN: duration(300, 900).default('15m'),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_REFRESH_EXPIRES_IN: duration(3600, 30 * 86400).default('7d'),

    // Segurança
    CORS_ORIGIN: z
      .string()
      .refine(
        (value) =>
          value.split(',').every((origin) => {
            try {
              const url = new URL(origin.trim());
              return (
                ['http:', 'https:'].includes(url.protocol) &&
                url.origin === origin.trim()
              );
            } catch {
              return false;
            }
          }),
        'Informe origens HTTP/HTTPS exatas, sem caminho ou wildcard.',
      )
      .default('http://localhost:5173'),
    THROTTLE_TTL: z.coerce.number().int().positive().default(60),
    THROTTLE_LIMIT: z.coerce.number().int().positive().default(120),
  })
  .superRefine((env, ctx) => {
    if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_REFRESH_SECRET'],
        message: 'Use segredos distintos.',
      });
    }
    if (env.NODE_ENV === 'production') {
      for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const) {
        if (/troque|example|change.?me|placeholder/i.test(env[key])) {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: 'Substitua o segredo de exemplo.',
          });
        }
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Variáveis de ambiente inválidas:\n${issues}`);
  }
  return parsed.data;
}
