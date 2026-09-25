import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from './entities/user.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Reservation]),
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService, RolesGuard],
})
export class UsersModule {}