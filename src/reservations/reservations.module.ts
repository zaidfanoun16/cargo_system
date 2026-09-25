import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';

import { Reservation } from './entities/reservation.entity';
import { User } from '../users/entities/user.entity';
import { Car } from '../cars/entities/car.entity';

import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reservation, User, Car]),

    AuthModule,

    EmailModule,
  ],

  controllers: [ReservationsController],

  providers: [ReservationsService],

  exports: [ReservationsService],
})
export class ReservationsModule {}
