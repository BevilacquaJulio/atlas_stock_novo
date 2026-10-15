import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../../generated/prisma/client';
import { buildDatabaseConfig } from '../config/database-url';
import { auditContext } from '../common/audit-context';
import type { Prisma } from '../../generated/prisma/client';

/**
 * PrismaService — instancia o PrismaClient com o driver adapter mariadb
 * (obrigatório no Prisma 7) e gerencia o ciclo de vida da conexão.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({ adapter: new PrismaMariaDb(buildDatabaseConfig()) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Conexão com o banco de dados estabelecida.');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  withAudit<T>(run: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.$transaction(async (tx) => {
      const result = await run(tx);
      const req = auditContext.getStore();
      if (req && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        // O evento COMMIT pertence à mesma transação; o middleware registra o HTTP final.
        await tx.eventoAuditoria.create({
          data: {
            usuarioId: req.user?.id ?? null,
            acao: `${req.method}:COMMIT`,
            recurso: req.path.slice(0, 200),
            resultado: 0,
            requestId: String(req.id ?? '').slice(0, 36),
          },
        });
      }
      return result;
    });
  }
}
