import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // POST /reservations/:id/review - the renter reviews a completed reservation
  @UseGuards(JwtAuthGuard)
  @Post('reservations/:id/review')
  create(
    @Param('id', ParseIntPipe) reservationId: number,
    @Body() createReviewDto: CreateReviewDto,
    @Req() request: Request,
  ) {
    const currentUser = request.user as {
      userId: number;
      email: string;
      role: string;
    };

    return this.reviewsService.create(
      reservationId,
      currentUser.userId,
      createReviewDto,
    );
  }

  // GET /cars/:id/reviews - Public
  @Get('cars/:id/reviews')
  findForCar(@Param('id', ParseIntPipe) carId: number) {
    return this.reviewsService.findForCar(carId);
  }

  // DELETE /reviews/:id - Admin only
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('reviews/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.remove(id);
  }
}
