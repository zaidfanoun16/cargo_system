import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

type CurrentUser = { userId: number; email: string; role: string };

@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  // The logged-in user's favorite cars
  @Get()
  findAll(@Req() request: Request) {
    return this.favoritesService.findAll((request.user as CurrentUser).userId);
  }

  // Ids of the favorite cars, e.g. [3, 7]
  @Get('ids')
  findIds(@Req() request: Request) {
    return this.favoritesService.findIds((request.user as CurrentUser).userId);
  }

  // PUT because saving the same car again changes nothing
  @Put(':carId')
  @HttpCode(204)
  add(@Param('carId', ParseIntPipe) carId: number, @Req() request: Request) {
    return this.favoritesService.add(
      (request.user as CurrentUser).userId,
      carId,
    );
  }

  @Delete(':carId')
  @HttpCode(204)
  remove(@Param('carId', ParseIntPipe) carId: number, @Req() request: Request) {
    return this.favoritesService.remove(
      (request.user as CurrentUser).userId,
      carId,
    );
  }
}
