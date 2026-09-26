import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';
import { UniqueViolationFilter } from './common/filters/unique-violation.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Behind a hosting proxy every request comes from the proxy, so the
  // rate limits would count all users together. TRUST_PROXY=true uses
  // the visitor's address from the proxy instead.
  if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // A duplicate unique value (e.g. license plate) answers 409, not 500
  app.useGlobalFilters(
    new UniqueViolationFilter(app.get(HttpAdapterHost).httpAdapter),
  );

  // بيسمح للفرونت إند (شغّال على بورت مختلف) يتصل بالباك إند.
  // بدون هالسطر، المتصفح بيمنع أي اتصال حتى لو الباك إند شغّال تمام.
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:5173'],
    credentials: false,
  });

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();