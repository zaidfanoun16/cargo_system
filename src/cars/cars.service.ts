import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';

import { Car } from './entities/car.entity';
import { CarImage } from './entities/car-image.entity';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { CarsQueryDto } from './dto/cars-query.dto';
import { CarCategory } from '../car-categories/entities/car-category.entity';
import { CarStatus } from './enums/car-status.enum';
import { Reservation } from '../reservations/entities/reservation.entity';
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
        images: true,
      },
      skip: (page - 1) * limit,
      take: limit,
      order: {
        createdAt: 'DESC',
        images: { createdAt: 'ASC' },
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
