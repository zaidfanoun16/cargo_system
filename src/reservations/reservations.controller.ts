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
import { HandoverCodeDto } from './dto/handover-code.dto';

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



  // ADMIN looks up the reservation of a handover code (from the
  // customer's QR code) before handing over the car
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('handover/:code')
  findByHandoverCode(
    @Param() params: HandoverCodeDto,
  ) {

    return this.reservationsService.findByHandoverCode(params.code);

  }



  // ADMIN hands the car over to the customer who showed the code
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('handover')
  handOver(
    @Body() handoverDto: HandoverCodeDto,
    @Req() request: Request,
  ) {

    const currentUser = request.user as {
      userId: number;
      email: string;
      role: string;
    };


    return this.reservationsService.handOver(
      handoverDto.code,
      currentUser.userId,
    );

  }



  // ADMIN takes the car back from the customer who showed the code
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('return')
  returnCar(
    @Body() handoverDto: HandoverCodeDto,
    @Req() request: Request,
  ) {

    const currentUser = request.user as {
      userId: number;
      email: string;
      role: string;
    };


    return this.reservationsService.returnCar(
      handoverDto.code,
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



  // ADMIN hands the car over to the customer
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/pickup')
  pickUp(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request,
  ) {

    const currentUser = request.user as {
      userId: number;
      email: string;
      role: string;
    };


    return this.reservationsService.pickUp(id, currentUser.userId);

  }



  // ADMIN prints the handover or return receipt
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get(':id/receipt')
  getReceipt(
    @Param('id', ParseIntPipe) id: number,
  ) {

    return this.reservationsService.getReceipt(id);

  }



  // ADMIN marks the car as returned
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/complete')
  complete(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request,
  ) {

    const currentUser = request.user as {
      userId: number;
      email: string;
      role: string;
    };


    return this.reservationsService.complete(id, currentUser.userId);

  }



  // USER says they are running late, so the car is kept a little longer
  @UseGuards(JwtAuthGuard)
  @Patch(':id/running-late')
  markRunningLate(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request,
  ) {

    const currentUser = request.user as {
      userId: number;
      email: string;
      role: string;
    };


    return this.reservationsService.markRunningLate(
      id,
      currentUser.userId,
    );

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
    @Req() request: Request,
  ) {

    const currentUser = request.user as {
      userId: number;
      email: string;
      role: string;
    };


    return this.reservationsService.updateStatus(
      id,
      updateStatusDto,
      currentUser.userId,
    );

  }

}