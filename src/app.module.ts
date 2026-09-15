import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    // Load variables from the .env file
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Connect NestJS to PostgreSQL
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

        // We will use migrations later
        synchronize: true,
      }),
    }),

    UsersModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}