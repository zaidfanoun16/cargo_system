import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CarCategoriesService } from './car-categories.service';
import { CarCategoriesController } from './car-categories.controller';
import { CarCategory } from './entities/car-category.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CarCategory]),
  ],
  controllers: [CarCategoriesController],
  providers: [CarCategoriesService],
  exports: [CarCategoriesService],
})
export class CarCategoriesModule {}