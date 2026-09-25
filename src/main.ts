import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

import { AppModule } from './app.module';
import { UniqueViolationFilter } from './common/filters/unique-violation.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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