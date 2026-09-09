import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { CarCategoriesModule } from './car-categories/car-categories.module';
import { CarsModule } from './cars/cars.module';

@Module({
  imports: [
    // Loads environment variables from .env
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Connects NestJS to PostgreSQL using TypeORM
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
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),

    // Application feature modules
    CarCategoriesModule,
    CarsModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}