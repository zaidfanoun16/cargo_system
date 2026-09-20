import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CarsController } from './cars.controller';
import { CarsService } from './cars.service';
import { Car } from './entities/car.entity';

import { CarCategory } from '../car-categories/entities/car-category.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),

    TypeOrmModule.forFeature([Car, CarCategory]),

    AuthModule,
  ],
  controllers: [CarsController],
  providers: [CarsService],
  exports: [CarsService],
})
export class CarsModule {}