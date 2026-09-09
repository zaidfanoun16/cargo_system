import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Car } from './entities/car.entity';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';

@Injectable()
export class CarsService {
  constructor(
    // Injects the Car repository to communicate with PostgreSQL
    @InjectRepository(Car)
    private readonly carsRepository: Repository<Car>,
  ) {}

  // Creates and saves a new car
  async create(createCarDto: CreateCarDto): Promise<Car> {
    const car = this.carsRepository.create(createCarDto);

    return this.carsRepository.save(car);
  }

  // Returns all cars
  async findAll(): Promise<Car[]> {
    return this.carsRepository.find();
  }

  // Returns one car by ID
  async findOne(id: number): Promise<Car> {
    const car = await this.carsRepository.findOne({
      where: { id },
    });

    if (!car) {
      throw new NotFoundException(`Car with ID ${id} not found`);
    }

    return car;
  }

  // Updates an existing car
  async update(id: number, updateCarDto: UpdateCarDto): Promise<Car> {
    const car = await this.findOne(id);

    Object.assign(car, updateCarDto);

    return this.carsRepository.save(car);
  }

  // Deletes an existing car
  async remove(id: number): Promise<void> {
    const car = await this.findOne(id);

    await this.carsRepository.remove(car);
  }
}