import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CarCategory } from './entities/car-category.entity';
import { CreateCarCategoryDto } from './dto/create-car-category.dto';
import { UpdateCarCategoryDto } from './dto/update-car-category.dto';
import { Car } from '../cars/entities/car.entity';

@Injectable()
export class CarCategoriesService {
  constructor(
    @InjectRepository(CarCategory)
    private readonly carCategoriesRepository: Repository<CarCategory>,

    @InjectRepository(Car)
    private readonly carsRepository: Repository<Car>,
  ) {}

  async create(
    createCarCategoryDto: CreateCarCategoryDto,
  ): Promise<CarCategory> {
    const category = this.carCategoriesRepository.create(createCarCategoryDto);

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
      throw new NotFoundException(`Car category with ID ${id} not found`);
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

    const carsCount = await this.carsRepository.count({
      where: {
        category: {
          id,
        },
      },
    });

    if (carsCount > 0) {
      throw new ConflictException(
        'Cannot delete category because it contains cars.',
      );
    }

    await this.carCategoriesRepository.remove(category);
  }
}
