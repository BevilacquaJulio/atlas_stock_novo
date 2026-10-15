import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { auditContext } from './audit-context';

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuditMiddleware.name);
  constructor(private readonly prisma: PrismaService) {}

  use(req: Request, res: Response, next: NextFunction) {
    res.on('finish', () => {
      if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return;
      const user = req.user;
      void this.prisma.eventoAuditoria
        .create({
          data: {
            usuarioId: user?.id ?? null,
            acao: req.method,
            recurso: req.path.slice(0, 200),
            resultado: res.statusCode,
            requestId: String(req.id ?? '').slice(0, 36),
          },
        })
        .catch(() =>
          this.logger.error('Falha ao persistir evento de auditoria.'),
        );
    });
    auditContext.run(req, next);
  }
}
