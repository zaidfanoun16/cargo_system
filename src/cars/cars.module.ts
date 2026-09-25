import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CarsController } from './cars.controller';
import { CarsService } from './cars.service';
import { Car } from './entities/car.entity';
import { CarImage } from './entities/car-image.entity';

import { CarCategory } from '../car-categories/entities/car-category.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { AuthModule } from '../auth/auth.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),

    TypeOrmModule.forFeature([Car, CarImage, CarCategory, Reservation]),

    AuthModule,

    ReviewsModule,

    CloudinaryModule,
  ],
  controllers: [CarsController],
  providers: [CarsService],
  exports: [CarsService],
})
export class CarsModule {}
