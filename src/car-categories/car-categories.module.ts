import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CarCategoriesService } from './car-categories.service';
import { CarCategoriesController } from './car-categories.controller';

import { CarCategory } from './entities/car-category.entity';
import { Car } from '../cars/entities/car.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),

    TypeOrmModule.forFeature([CarCategory, Car]),

    AuthModule,
  ],
  controllers: [CarCategoriesController],
  providers: [CarCategoriesService],
  exports: [CarCategoriesService],
})
export class CarCategoriesModule {}