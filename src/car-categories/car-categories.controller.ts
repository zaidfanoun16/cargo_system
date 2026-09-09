import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { CarCategoriesService } from './car-categories.service';
import { CreateCarCategoryDto } from './dto/create-car-category.dto';
import { UpdateCarCategoryDto } from './dto/update-car-category.dto';

@Controller('car-categories')
export class CarCategoriesController {
  constructor(
    private readonly carCategoriesService: CarCategoriesService,
  ) {}

  @Post()
  create(@Body() createCarCategoryDto: CreateCarCategoryDto) {
    return this.carCategoriesService.create(createCarCategoryDto);
  }

  @Get()
  findAll() {
    return this.carCategoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.carCategoriesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCarCategoryDto: UpdateCarCategoryDto,
  ) {
    return this.carCategoriesService.update(id, updateCarCategoryDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.carCategoriesService.remove(id);
  }
}