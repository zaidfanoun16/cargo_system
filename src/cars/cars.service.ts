import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsWhere,
  ILike,
  In,
  LessThan,
  MoreThan,
  Not,
  Repository,
} from 'typeorm';

import { Car } from './entities/car.entity';
import { CarImage } from './entities/car-image.entity';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { CarsQueryDto } from './dto/cars-query.dto';
import { CarCategory } from '../car-categories/entities/car-category.entity';
import { CarStatus } from './enums/car-status.enum';
import { Reservation } from '../reservations/entities/reservation.entity';
import { ReservationStatus } from '../reservations/enums/reservation-status.enum';
import { ReviewsService } from '../reviews/reviews.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

// Most photos one car can have
const MAX_IMAGES_PER_CAR = 10;

@Injectable()
export class CarsService {
  constructor(
    @InjectRepository(Car)
    private readonly carsRepository: Repository<Car>,

    @InjectRepository(CarCategory)
    private readonly carCategoriesRepository: Repository<CarCategory>,

    @InjectRepository(Reservation)
    private readonly reservationsRepository: Repository<Reservation>,

    @InjectRepository(CarImage)
    private readonly carImagesRepository: Repository<CarImage>,

    private readonly cloudinaryService: CloudinaryService,

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
      search,
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

    // Brand and model match either the English or the Arabic name, so each
    // one becomes a list of alternatives that are OR-ed together
    const brandOptions: FindOptionsWhere<Car>[] = brand
      ? [{ brand: ILike(`%${brand}%`) }, { brandAr: ILike(`%${brand}%`) }]
      : [{}];
    const modelOptions: FindOptionsWhere<Car>[] = model
      ? [{ model: ILike(`%${model}%`) }, { modelAr: ILike(`%${model}%`) }]
      : [{}];
    const searchText = search?.trim();
    const searchOptions: FindOptionsWhere<Car>[] = searchText
      ? [
          { brand: ILike(`%${searchText}%`) },
          { brandAr: ILike(`%${searchText}%`) },
          { model: ILike(`%${searchText}%`) },
          { modelAr: ILike(`%${searchText}%`) },
        ]
      : [{}];

    const baseWhere: FindOptionsWhere<Car> = {
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
    };

    const [cars, total] = await this.carsRepository.findAndCount({
      where: brandOptions.flatMap((brandWhere) =>
        modelOptions.flatMap((modelWhere) =>
          searchOptions.map((searchWhere) => ({
            ...baseWhere,
            ...brandWhere,
            ...modelWhere,
            ...searchWhere,
          })),
        ),
      ),
      relations: {
        category: true,
        images: true,
      },
      skip: (page - 1) * limit,
      take: limit,
      order: {
        createdAt: 'DESC',
        images: { createdAt: 'ASC' },
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
        images: true,
      },
      order: {
        images: { createdAt: 'ASC' },
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

    // Delete the photos from Cloudinary too; the database rows are
    // removed with the car
    for (const image of car.images) {
      await this.cloudinaryService.deleteImage(image.publicId);
    }

    await this.carsRepository.remove(car);
  }

  // ADMIN: upload photos of a car to Cloudinary
  async addImages(id: number, files: Express.Multer.File[]) {
    const car = await this.findOne(id);

    if (!files || files.length === 0) {
      throw new BadRequestException('Send at least one image');
    }

    if (car.images.length + files.length > MAX_IMAGES_PER_CAR) {
      throw new BadRequestException(
        `A car can have at most ${MAX_IMAGES_PER_CAR} images (it has ${car.images.length})`,
      );
    }

    for (const file of files) {
      const { url, publicId } = await this.cloudinaryService.uploadImage(
        file,
        'cargo-system/cars',
      );

      await this.carImagesRepository.save(
        this.carImagesRepository.create({ url, publicId, carId: id }),
      );
    }

    return this.findOne(id);
  }

  // ADMIN: delete one photo of a car
  async removeImage(carId: number, imageId: number): Promise<void> {
    const image = await this.carImagesRepository.findOne({
      where: { id: imageId, carId },
    });

    if (!image) {
      throw new NotFoundException(
        `Image with ID ${imageId} not found for car ${carId}`,
      );
    }

    await this.cloudinaryService.deleteImage(image.publicId);

    await this.carImagesRepository.remove(image);
  }
}
