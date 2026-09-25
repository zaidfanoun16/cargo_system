import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { ReservationsService } from './reservations.service';

import { CreateReservationDto } from './dto/create-reservation.dto';
import { QuoteReservationDto } from './dto/quote-reservation.dto';
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



  // PUBLIC: price and availability before booking
  // (declared before ':id' so "quote" is not read as an id)
  @Get('quote')
  quote(@Query() quoteDto: QuoteReservationDto) {
    return this.reservationsService.quote(quoteDto);
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



  // ADMIN views reservations of a specific user
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('user/:userId')
  getUserReservations(
    @Param('userId', ParseIntPipe) userId: number,
  ) {

    return this.reservationsService.getUserReservations(
      userId,
    );

  }



  // USER / ADMIN views one reservation
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request,
  ) {

    const currentUser = request.user as {
      userId: number;
      email: string;
      role: string;
    };


    return this.reservationsService.getOne(
      id,
      currentUser.userId,
      currentUser.role,
    );

  }



  // ADMIN views all reservations
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get()
  findAll() {

    return this.reservationsService.findAll();

  }



  // ADMIN confirms a pending reservation
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/confirm')
  confirm(
    @Param('id', ParseIntPipe) id: number,
  ) {

    return this.reservationsService.confirm(id);

  }



  // ADMIN completes a confirmed reservation
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/complete')
  complete(
    @Param('id', ParseIntPipe) id: number,
  ) {

    return this.reservationsService.complete(id);

  }



  // USER / ADMIN cancels a reservation
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
      currentUser.role,
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