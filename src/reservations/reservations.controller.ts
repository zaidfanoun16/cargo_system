import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { ReservationsService } from './reservations.service';

import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationStatusDto } from './dto/update-reservation-status.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';


@Controller('reservations')
export class ReservationsController {

  constructor(
    private readonly reservationsService: ReservationsService,
  ) {}


  // USER creates a reservation
  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Body() createReservationDto: CreateReservationDto,
    @Req() request: Request,
  ) {

    const currentUser = request.user as {
      userId: number;
      email: string;
      role: string;
    };


    return this.reservationsService.create(
      createReservationDto,
      currentUser,
    );
  }



  // USER views his own reservations
  @UseGuards(JwtAuthGuard)
  @Get('my')
  getMyReservations(
    @Req() request: Request,
  ) {

    const currentUser = request.user as {
      userId: number;
      email: string;
      role: string;
    };


    return this.reservationsService.getMyReservations(
      currentUser.userId,
    );
  }



  // ADMIN views all reservations
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get()
  findAll() {

    return this.reservationsService.findAll();

  }



  // USER cancels his reservation
  @UseGuards(JwtAuthGuard)
  @Patch(':id/cancel')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request,
  ) {

    const currentUser = request.user as {
      userId: number;
      email: string;
      role: string;
    };


    return this.reservationsService.cancel(
      id,
      currentUser.userId,
    );
  }



  // ADMIN changes reservation status
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateReservationStatusDto,
  ) {

    return this.reservationsService.updateStatus(
      id,
      updateStatusDto,
    );

  }

}