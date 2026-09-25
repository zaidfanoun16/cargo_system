import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import {
  ILike,
  In,
  LessThan,
  MoreThan,
  Repository,
} from 'typeorm';

import { Car } from './entities/car.entity';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { CarsQueryDto } from './dto/cars-query.dto';
import { CarCategory } from '../car-categories/entities/car-category.entity';
import { CarStatus } from './enums/car-status.enum';
import { Reservation } from '../reservations/entities/reservation.entity';
import { ReservationStatus } from '../reservations/enums/reservation-status.enum';

@Injectable()
export class CarsService {
  constructor(
    @InjectRepository(Car)
    private readonly carsRepository: Repository<Car>,

    @InjectRepository(CarCategory)
    private readonly carCategoriesRepository: Repository<CarCategory>,

    @InjectRepository(Reservation)
    private readonly reservationsRepository: Repository<Reservation>,
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
      status: carData.status ?? CarStatus.AVAILABLE,
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

  // Calendar of a car for one month: the reserved periods and every day
  // that is at least partly reserved. Who reserved is never shown.
  async getAvailability(id: number, month?: string) {
    const car = await this.findOne(id);

    // Work in UTC so a day is the same for every server time zone
    const now = new Date();
    const [year, monthIndex] = month
      ? [Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1]
      : [now.getUTCFullYear(), now.getUTCMonth()];

    const monthStart = new Date(Date.UTC(year, monthIndex, 1));
    const monthEnd = new Date(Date.UTC(year, monthIndex + 1, 1));

    // Same rule as creating a reservation: PENDING and CONFIRMED block
    const reservations = await this.reservationsRepository.find({
      select: { startDate: true, endDate: true, status: true },
      where: {
        carId: id,
        status: In([
          ReservationStatus.PENDING,
          ReservationStatus.CONFIRMED,
        ]),
        startDate: LessThan(monthEnd),
        endDate: MoreThan(monthStart),
      },
      order: { startDate: 'ASC' },
    });

    const dayInMs = 24 * 60 * 60 * 1000;
    const bookedDates: string[] = [];

    for (
      let day = monthStart.getTime();
      day < monthEnd.getTime();
      day += dayInMs
    ) {
      const isBooked = reservations.some(
        (reservation) =>
          reservation.startDate.getTime() < day + dayInMs &&
          reservation.endDate.getTime() > day,
      );

      if (isBooked) {
        bookedDates.push(new Date(day).toISOString().slice(0, 10));
      }
    }

    return {
      carId: car.id,
      carStatus: car.status,
      month: monthStart.toISOString().slice(0, 7),
      bookedPeriods: reservations.map((reservation) => ({
        startDate: reservation.startDate,
        endDate: reservation.endDate,
        status: reservation.status,
      })),
      bookedDates,
    };
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

    // Reservations reference the car, so deleting it would fail and
    // erase the rental history
    const reservationsCount = await this.reservationsRepository.count({
      where: { carId: id },
    });

    if (reservationsCount > 0) {
      throw new ConflictException(
        'Cannot delete car because it has reservations. Set its status to INACTIVE instead.',
      );
    }

    await this.carsRepository.remove(car);
  }
}