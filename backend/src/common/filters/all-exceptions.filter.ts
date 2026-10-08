import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ZodValidationException } from 'nestjs-zod';
import type { Request, Response } from 'express';

interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    requestId?: string | number;
    details?: unknown;
  };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, body } = this.buildError(exception);
    body.error.requestId =
      typeof request.id === 'string' || typeof request.id === 'number'
        ? request.id
        : undefined;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error({
        event: 'request_failed',
        requestId: request.id,
        status,
      });
    }

    response.status(status).json(body);
  }

  private buildError(exception: unknown): {
    status: number;
    body: ErrorEnvelope;
  } {
    const parserError = exception as {
      type?: unknown;
      status?: unknown;
    } | null;
    if (
      parserError?.type === 'entity.too.large' &&
      parserError.status === 413
    ) {
      return {
        status: 413,
        body: {
          error: {
            code: 'PAYLOAD_TOO_LARGE',
            message: 'Requisição excede o limite de 100 KB.',
          },
        },
      };
    }
    if (
      parserError?.type === 'entity.parse.failed' &&
      parserError.status === 400
    ) {
      return {
        status: 400,
        body: { error: { code: 'BAD_REQUEST', message: 'JSON inválido.' } },
      };
    }
    if (exception instanceof ZodValidationException) {
      const zodError = exception.getZodError();
      return {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        body: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Dados inválidos.',
            details: zodError.issues.map((issue) => ({
              path: issue.path,
              code: issue.code,
              message:
                issue.code === 'unrecognized_keys'
                  ? 'Campos não permitidos.'
                  : 'Valor inválido para este campo.',
            })),
          },
        },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status >= 500) {
        return {
          status,
          body: {
            error: {
              code: status === 503 ? 'SERVICE_UNAVAILABLE' : 'INTERNAL_ERROR',
              message: 'Serviço indisponível.',
            },
          },
        };
      }
      const res = exception.getResponse();
      const message =
        typeof res === 'string'
          ? res
          : (((res as Record<string, unknown>)?.message as string) ??
            exception.message);
      return {
        status,
        body: {
          error: {
            code: this.codeFromStatus(status),
            message: Array.isArray(message) ? message.join('; ') : message,
          },
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor.',
        },
      },
    };
  }

  private codeFromStatus(status: number): string {
    const map: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'VALIDATION_ERROR',
    };
    return map[status] ?? 'ERROR';
  }
}
