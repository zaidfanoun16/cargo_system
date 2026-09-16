import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CarCategory } from './entities/car-category.entity';
import { CreateCarCategoryDto } from './dto/create-car-category.dto';
import { UpdateCarCategoryDto } from './dto/update-car-category.dto';

@Injectable()
export class CarCategoriesService {
  constructor(
    @InjectRepository(CarCategory)
    private readonly carCategoriesRepository: Repository<CarCategory>,
  ) {}

  async create(
    createCarCategoryDto: CreateCarCategoryDto,
  ): Promise<CarCategory> {
    const category = this.carCategoriesRepository.create(
      createCarCategoryDto,
    );

    return this.carCategoriesRepository.save(category);
  }

  async findAll(): Promise<CarCategory[]> {
    return this.carCategoriesRepository.find();
  }

  async findOne(id: number): Promise<CarCategory> {
    const category = await this.carCategoriesRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(
        `Car category with ID ${id} not found`,
      );
    }

    return category;
  }

  async update(
    id: number,
    updateCarCategoryDto: UpdateCarCategoryDto,
  ): Promise<CarCategory> {
    const category = await this.findOne(id);

    Object.assign(category, updateCarCategoryDto);

    return this.carCategoriesRepository.save(category);
  }

  async remove(id: number): Promise<void> {
    const category = await this.findOne(id);

    await this.carCategoriesRepository.remove(category);
  }
}