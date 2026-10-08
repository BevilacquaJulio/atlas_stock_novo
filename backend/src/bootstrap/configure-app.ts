import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import type { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

export function configureApp(app: NestExpressApplication): void {
  const config = app.get(ConfigService);
  app.use((req: Request, res: Response, next: NextFunction) => {
    req.id = randomUUID();
    res.setHeader('X-Request-Id', req.id);
    next();
  });
  app.use(helmet());
  app.enableCors({
    origin: config
      .get<string>('CORS_ORIGIN', 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim()),
    credentials: true,
    exposedHeaders: ['X-Request-Id'],
  });
  app.use(json({ limit: '100kb' }));
  app.use(urlencoded({ extended: false, limit: '100kb', parameterLimit: 100 }));
  app.use(
    (error: unknown, _req: Request, _res: Response, next: NextFunction) => {
      const parserError = error as { type?: unknown } | null;
      next(
        parserError?.type === 'entity.parse.failed'
          ? new BadRequestException('JSON inválido.')
          : error,
      );
    },
  );
  app.setGlobalPrefix('api');
  if (config.get<string>('NODE_ENV') !== 'production') {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Atlas Stock API')
        .setDescription('API do ERP de gestão de blindagem de veículos.')
        .setVersion('1.0')
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup('api/docs', app, document);
  }
}
