import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';

import { CarCategoriesModule } from './car-categories/car-categories.module';
import { CarsModule } from './cars/cars.module';
import { AuthModule } from './auth/auth.module';

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

    // Application feature modules
    UsersModule,
    CarCategoriesModule,
    CarsModule,
    AuthModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}