import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { from, mergeMap, type Observable } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    if (
      req.method !== 'POST' ||
      !/^\/api\/(compras|movimentacoes|financeiro\/(despesas|receitas)|projetos(?:\/\d+\/consumos)?)$/.test(
        req.path,
      )
    )
      return next.handle();
    const key = req.headers['idempotency-key'];
    if (key === undefined) return next.handle();
    if (typeof key !== 'string' || !/^[a-f0-9-]{36}$/.test(key) || !req.user)
      throw new BadRequestException('Chave de idempotência inválida.');
    const usuarioId = req.user.id;
    const resumoEntrada = createHash('sha256')
      .update(`${req.method}:${req.path}:${JSON.stringify(req.body)}`)
      .digest('hex');
    const reserve = async () => {
      try {
        return {
          replay: false,
          row: await this.prisma.requisicaoIdempotente.create({
            data: { usuarioId, chave: key, resumoEntrada },
          }),
        };
      } catch (error) {
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== 'P2002'
        )
          throw error;
        const row = await this.prisma.requisicaoIdempotente.findUniqueOrThrow({
          where: { usuarioId_chave: { usuarioId, chave: key } },
        });
        if (row.resumoEntrada !== resumoEntrada)
          throw new ConflictException('Chave já usada com outra operação.');
        if (row.resposta === null)
          throw new ConflictException(
            'Operação em andamento ou resultado incerto. Consulte os registros antes de enviar novamente.',
          );
        return { replay: true, row };
      }
    };
    return from(reserve()).pipe(
      mergeMap(({ replay, row }) => {
        if (replay) return from(Promise.resolve(row.resposta));
        return next.handle().pipe(
          mergeMap(async (response: unknown) => {
            // Reserva sem resposta permanece bloqueada após falha/crash: não duplica o efeito.
            await this.prisma.requisicaoIdempotente.update({
              where: { id: row.id },
              data: {
                resposta: JSON.parse(
                  JSON.stringify(response),
                ) as Prisma.InputJsonValue,
              },
            });
            return response;
          }),
        );
      }),
    );
  }
}
