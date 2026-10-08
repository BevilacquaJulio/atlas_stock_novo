import { randomUUID } from 'node:crypto';
import type { Options } from 'pino-http';

export const httpLoggingOptions: Options = {
  genReqId: (req, res) => {
    const id = typeof req.id === 'string' ? req.id : randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-financeiro-token"]',
      'res.headers["set-cookie"]',
    ],
    remove: true,
  },
  serializers: {
    // A allowlist evita registrar query, headers e payloads com dados pessoais.
    req: (req: { id?: string; method?: string; url?: string }) => ({
      id: req.id,
      method: req.method,
      path: req.url?.split('?')[0],
    }),
    res: (res: { statusCode?: number }) => ({ statusCode: res.statusCode }),
    err: () => ({ type: 'RequestError' }),
  },
};
