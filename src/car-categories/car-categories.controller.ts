import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CarCategoriesService } from './car-categories.service';

import { CreateCarCategoryDto } from './dto/create-car-category.dto';
import { UpdateCarCategoryDto } from './dto/update-car-category.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('car-categories')
export class CarCategoriesController {
  constructor(
    private readonly carCategoriesService: CarCategoriesService,
  ) {}

  // POST /car-categories - Admin only
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() createCarCategoryDto: CreateCarCategoryDto) {
    return this.carCategoriesService.create(createCarCategoryDto);
  }

  // GET /car-categories - Public
  @Get()
  findAll() {
    return this.carCategoriesService.findAll();
  }

  // GET /car-categories/:id - Public
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.carCategoriesService.findOne(id);
  }

  // PATCH /car-categories/:id - Admin only
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCarCategoryDto: UpdateCarCategoryDto,
  ) {
    return this.carCategoriesService.update(id, updateCarCategoryDto);
  }

  // DELETE /car-categories/:id - Admin only
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.carCategoriesService.remove(id);
  }
}