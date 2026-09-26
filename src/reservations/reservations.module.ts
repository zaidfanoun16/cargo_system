import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';

import { Reservation } from './entities/reservation.entity';
import { User } from '../users/entities/user.entity';
import { Car } from '../cars/entities/car.entity';
import { Review } from '../reviews/entities/review.entity';

import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';


@Module({

  imports: [
    TypeOrmModule.forFeature([
      Reservation,
      User,
      Car,
      Review,
    ]),

    AuthModule,

    EmailModule,

    NotificationsModule,
  ],

  controllers: [
    ReservationsController,
  ],

  providers: [
    ReservationsService,
  ],

  exports: [
    ReservationsService,
  ],

})
export class ReservationsModule {}