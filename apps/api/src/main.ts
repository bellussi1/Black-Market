import { RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { requestControls } from './operations/request-controls';
import { SafeExceptionFilter } from './operations/safe-exception.filter';
import { StructuredLogger } from './operations/structured-logger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const logger = new StructuredLogger(config.getOrThrow<string>('NODE_ENV'));
  app.useLogger(logger);
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app
    .getHttpAdapter()
    .getInstance()
    .set(
      'trust proxy',
      config.get<boolean>('TRUST_PROXY', false) ? 'loopback,linklocal,uniquelocal' : false,
    );
  app.use(
    requestControls(
      logger,
      config.getOrThrow<string>('NODE_ENV'),
      config.getOrThrow<string>('WEB_ORIGIN'),
    ),
  );
  app.useGlobalFilters(new SafeExceptionFilter(logger));
  app.useBodyParser('json', { limit: '20mb' });

  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
      { path: 'ready', method: RequestMethod.GET },
    ],
  });
  app.enableCors({
    origin: config.getOrThrow<string>('WEB_ORIGIN'),
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Request-ID', 'Retry-After'],
    maxAge: 600,
  });
  app.enableShutdownHooks();

  const apiDocument = new DocumentBuilder()
    .setTitle('Black Market API')
    .setDescription('API pública versionada do projeto pessoal Black Market.')
    .setVersion('1.0.0')
    .build();
  if (config.get<string>('NODE_ENV') !== 'production')
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, apiDocument));

  await app.listen(config.getOrThrow<number>('PORT'), '0.0.0.0');
}

void bootstrap();
