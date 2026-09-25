import {
  BadRequestException,
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
  Not,
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
import { ReviewsService } from '../reviews/reviews.service';

@Injectable()
export class CarsService {
  constructor(
    @InjectRepository(Car)
    private readonly carsRepository: Repository<Car>,

    @InjectRepository(CarCategory)
    private readonly carCategoriesRepository: Repository<CarCategory>,

    @InjectRepository(Reservation)
    private readonly reservationsRepository: Repository<Reservation>,

    private readonly reviewsService: ReviewsService,
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
      startDate,
      endDate,
    } = query;

    const reservedCarIds = await this.findReservedCarIds(
      startDate,
      endDate,
      status,
    );

    const [cars, total] = await this.carsRepository.findAndCount({
      where: {
        ...(brand && { brand: ILike(`%${brand}%`) }),
        ...(model && { model: ILike(`%${model}%`) }),
        ...(status && { status }),
        // Searching by dates only returns cars that can be reserved
        ...(reservedCarIds && {
          status: CarStatus.AVAILABLE,
          id: Not(In(reservedCarIds)),
        }),
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

    const ratings = await this.reviewsService.getRatings(
      cars.map((car) => car.id),
    );

    return {
      data: cars.map((car) => ({ ...car, ...ratings.get(car.id) })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // A car with its average rating and number of reviews
  async findOneWithRating(id: number) {
    const car = await this.findOne(id);

    const ratings = await this.reviewsService.getRatings([id]);

    return { ...car, ...ratings.get(id) };
  }

  // IDs of cars with an active reservation overlapping the requested
  // period, or undefined when no period was requested
  private async findReservedCarIds(
    startDate: string | undefined,
    endDate: string | undefined,
    status: CarStatus | undefined,
  ): Promise<number[] | undefined> {
    if (!startDate && !endDate) {
      return undefined;
    }

    if (!startDate || !endDate) {
      throw new BadRequestException(
        'startDate and endDate must be sent together',
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      throw new BadRequestException('endDate must be after startDate');
    }

    if (status && status !== CarStatus.AVAILABLE) {
      throw new BadRequestException(
        'Only AVAILABLE cars can be searched by dates',
      );
    }

    // Same overlap rule as creating a reservation
    const reservations = await this.reservationsRepository.find({
      select: { carId: true },
      where: {
        status: In([
          ReservationStatus.PENDING,
          ReservationStatus.CONFIRMED,
        ]),
        startDate: LessThan(end),
        endDate: MoreThan(start),
      },
    });

    return [...new Set(reservations.map((r) => r.carId))];
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