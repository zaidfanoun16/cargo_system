import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';

import { Car } from './entities/car.entity';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { CarsQueryDto } from './dto/cars-query.dto';
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

  async findAll(query: CarsQueryDto) {
    const {
      page = 1,
      limit = 10,
      brand,
      model,
      status,
      categoryId,
    } = query;

    const [cars, total] = await this.carsRepository.findAndCount({
      where: {
        ...(brand && { brand: ILike(`%${brand}%`) }),
        ...(model && { model: ILike(`%${model}%`) }),
        ...(status && { status }),
        ...(categoryId && {
          category: {
            id: categoryId,
          },
        }),
      },
      relations: {
        category: true,
      },
      skip: (page - 1) * limit,
      take: limit,
      order: {
        createdAt: 'DESC',
      },
    });

    return {
      data: cars,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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