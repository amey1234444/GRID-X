import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { SentryService } from './common/sentry.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.enableCors({
    origin: config.get<string[]>('corsOrigins') ?? true,
    credentials: true,
  });
  app.setGlobalPrefix(config.get<string>('globalPrefix') ?? 'api');
  app.useGlobalFilters(new AllExceptionsFilter(app.get(SentryService)));
  app.enableShutdownHooks();

  const swagger = new DocumentBuilder()
    .setTitle('GRID-X API')
    .setDescription('OSWAR distributed manufacturing network operating system')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));

  const port = config.get<number>('port') ?? 4000;
  await app.listen(port, '0.0.0.0');
  new Logger('Bootstrap').log(`GRID-X API listening on http://localhost:${port}`);
}

void bootstrap();
