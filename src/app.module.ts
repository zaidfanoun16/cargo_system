import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';

import { CarCategoriesModule } from './car-categories/car-categories.module';
import { CarsModule } from './cars/cars.module';
import { AuthModule } from './auth/auth.module';
import { ReservationsModule } from './reservations/reservations.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    // Load environment variables from the .env file
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Connect NestJS to PostgreSQL using TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),

        // Automatically load entities from feature modules
        autoLoadEntities: true,

        // Use migrations later; do not synchronize automatically
        synchronize: false,
      }),
    }),

    // Rate limiting: each client IP gets at most 100 requests per minute.
    // Sensitive routes set a lower limit with @Throttle().
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),

    // Application feature modules
    UsersModule,
    CarCategoriesModule,
    CarsModule,
    AuthModule,
    ReservationsModule,
    EmailModule,
  ],

  controllers: [AppController],
  providers: [
    AppService,

    // Apply rate limiting to every route
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}