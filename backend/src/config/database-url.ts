import { readFileSync } from 'node:fs';

/**
 * Constrói a URL de conexão MySQL a partir das variáveis de ambiente MYSQL_*.
 *
 * Regras críticas (ver backend-nestjs-rules):
 * - user e password são codificados com encodeURIComponent para que
 *   caracteres como @ # : / ? & = não corrompam a URL.
 * - a URL termina com ?charset=utf8mb4.
 * - em produção, MYSQL_SSL=true força TLS. Certificados internos
 *   autoassinados podem ser aceitos com MYSQL_SSL_REJECT_UNAUTHORIZED=false.
 *
 * A CLI do Prisma usa uma URL; o driver MariaDB usado pela aplicação precisa
 * de um objeto para configurar corretamente a validação do certificado TLS.
 */
function useDatabaseSsl(): boolean {
  return process.env.MYSQL_SSL?.trim().toLowerCase() === 'true';
}

function rejectUnauthorizedCertificate(): boolean {
  return (
    process.env.MYSQL_SSL_REJECT_UNAUTHORIZED?.trim().toLowerCase() !== 'false'
  );
}

function getDatabaseCaPath(): string {
  const caPath = process.env.MYSQL_SSL_CA_PATH?.trim();
  if (!caPath) {
    throw new Error('MYSQL_SSL_CA_PATH é obrigatório quando MYSQL_SSL=true.');
  }
  return caPath;
}

export function buildDatabaseUrl(): string {
  const host = process.env.MYSQL_HOST ?? 'localhost';
  const port = process.env.MYSQL_PORT ?? '3306';
  const user = encodeURIComponent(process.env.MYSQL_USER ?? 'root');
  const password = encodeURIComponent(process.env.MYSQL_PASSWORD ?? '');
  const database = process.env.MYSQL_DATABASE ?? 'g5';

  const params = new URLSearchParams({ charset: 'utf8mb4' });
  if (useDatabaseSsl()) {
    params.set('sslcert', getDatabaseCaPath());
    params.set(
      'sslaccept',
      rejectUnauthorizedCertificate() ? 'strict' : 'accept_invalid_certs',
    );
  }

  return `mysql://${user}:${password}@${host}:${port}/${database}?${params.toString()}`;
}

export function buildDatabaseConfig(): {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  charset: string;
  ssl?: { ca: Buffer; rejectUnauthorized: boolean };
} {
  const ssl = useDatabaseSsl()
    ? {
        ca: readFileSync(getDatabaseCaPath()),
        rejectUnauthorized: rejectUnauthorizedCertificate(),
      }
    : undefined;

  return {
    host: process.env.MYSQL_HOST ?? 'localhost',
    port: Number(process.env.MYSQL_PORT ?? '3306'),
    user: process.env.MYSQL_USER ?? 'root',
    password: process.env.MYSQL_PASSWORD ?? '',
    database: process.env.MYSQL_DATABASE ?? 'g5',
    charset: 'utf8mb4',
    ...(ssl ? { ssl } : {}),
  };
}
