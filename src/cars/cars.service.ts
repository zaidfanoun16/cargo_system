import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Car } from './entities/car.entity';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { CarCategory } from '../car-categories/entities/car-category.entity';

@Injectable()
export class CarsService {
  constructor(
    @InjectRepository(Car)
    private readonly carsRepository: Repository<Car>,

    @InjectRepository(CarCategory)
    private readonly carCategoriesRepository: Repository<CarCategory>,
  ) {}

  async create(createCarDto: CreateCarDto): Promise<Car> {
    const { categoryId, ...carData } = createCarDto;

    const category = await this.carCategoriesRepository.findOne({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException(
        `Car category with ID ${categoryId} not found`,
      );
    }

    const car = this.carsRepository.create({
      ...carData,
      category,
    });

    return this.carsRepository.save(car);
  }

  async findAll(): Promise<Car[]> {
    return this.carsRepository.find({
      relations: {
        category: true,
      },
    });
  }

  async findOne(id: number): Promise<Car> {
    const car = await this.carsRepository.findOne({
      where: { id },
      relations: {
        category: true,
      },
    });

    if (!car) {
      throw new NotFoundException(`Car with ID ${id} not found`);
    }

    return car;
  }

  async update(
    id: number,
    updateCarDto: UpdateCarDto,
  ): Promise<Car> {
    const car = await this.findOne(id);

    const { categoryId, ...carData } = updateCarDto;

    if (categoryId !== undefined) {
      const category = await this.carCategoriesRepository.findOne({
        where: { id: categoryId },
      });

      if (!category) {
        throw new NotFoundException(
          `Car category with ID ${categoryId} not found`,
        );
      }

      car.category = category;
    }

    Object.assign(car, carData);

    return this.carsRepository.save(car);
  }

  async remove(id: number): Promise<void> {
    const car = await this.findOne(id);

    await this.carsRepository.remove(car);
  }
}