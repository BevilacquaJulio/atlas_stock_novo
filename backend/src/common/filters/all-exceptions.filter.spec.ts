import { afterEach, describe, expect, it, vi } from 'vitest';
import { type ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { ZodValidationException } from 'nestjs-zod';
import { z } from 'zod';
import { AllExceptionsFilter } from './all-exceptions.filter';

function respond(error: unknown, id: unknown = 'request-123') {
  const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ id }),
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;
  new AllExceptionsFilter().catch(error, host);
  return {
    status: response.status.mock.calls[0][0],
    body: response.json.mock.calls[0][0],
  };
}

afterEach(() => vi.restoreAllMocks());

describe('respostas seguras de erros', () => {
  it.each([
    [400, 'BAD_REQUEST'],
    [401, 'UNAUTHORIZED'],
    [403, 'FORBIDDEN'],
    [404, 'NOT_FOUND'],
    [409, 'CONFLICT'],
    [422, 'VALIDATION_ERROR'],
    [429, 'RATE_LIMITED'],
    [418, 'ERROR'],
  ])('preserva status %i e o identificador da requisição', (status, code) => {
    expect(respond(new HttpException('Mensagem pública', status))).toEqual({
      status,
      body: {
        error: { code, message: 'Mensagem pública', requestId: 'request-123' },
      },
    });
  });

  it('normaliza mensagens de validação e IDs sem expor objetos', () => {
    expect(
      respond(new HttpException({ message: ['Campo A', 'Campo B'] }, 400), 42)
        .body.error,
    ).toEqual({
      code: 'BAD_REQUEST',
      message: 'Campo A; Campo B',
      requestId: 42,
    });
    expect(
      respond(new HttpException({}, 400), { secret: 'private' }).body.error
        .requestId,
    ).toBeUndefined();
  });

  it.each([
    [
      { type: 'entity.too.large', status: 413, body: 'secret' },
      413,
      'PAYLOAD_TOO_LARGE',
    ],
    [
      { type: 'entity.parse.failed', status: 400, body: 'secret' },
      400,
      'BAD_REQUEST',
    ],
  ])(
    'não devolve o corpo que provocou erro no parser',
    (error, status, code) => {
      const result = respond(error);
      expect(result.status).toBe(status);
      expect(result.body.error.code).toBe(code);
      expect(JSON.stringify(result.body)).not.toContain('secret');
    },
  );

  it('remove valores e nomes de campos desconhecidos dos detalhes Zod', () => {
    const parsed = z
      .object({ idade: z.number() })
      .strict()
      .safeParse({ idade: 'secret', secret: 'password' });
    if (parsed.success) throw new Error('A entrada deve ser inválida');
    const result = respond(new ZodValidationException(parsed.error));
    expect(result.status).toBe(422);
    expect(result.body.error.details).toEqual([
      {
        path: ['idade'],
        code: 'invalid_type',
        message: 'Valor inválido para este campo.',
      },
      {
        path: [],
        code: 'unrecognized_keys',
        message: 'Campos não permitidos.',
      },
    ]);
    expect(JSON.stringify(result.body)).not.toContain('secret');
  });

  it.each([
    new Error('SQL password=secret'),
    new HttpException('secret', 500),
    new HttpException('secret', 503),
    null,
  ])('não vaza detalhes internos na resposta nem no log', (error) => {
    const log = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const result = respond(error);
    expect(result.status).toBe(
      error instanceof HttpException ? error.getStatus() : 500,
    );
    expect(result.body.error.code).toBe(
      result.status === 503 ? 'SERVICE_UNAVAILABLE' : 'INTERNAL_ERROR',
    );
    expect(JSON.stringify(result.body)).not.toContain('secret');
    expect(log).toHaveBeenCalledWith({
      event: 'request_failed',
      requestId: 'request-123',
      status: result.status,
    });
  });
});
