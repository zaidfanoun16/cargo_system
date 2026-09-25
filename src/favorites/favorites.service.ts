import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Favorite } from './entities/favorite.entity';
import { Car } from '../cars/entities/car.entity';
import { ReviewsService } from '../reviews/reviews.service';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoritesRepository: Repository<Favorite>,

    @InjectRepository(Car)
    private readonly carsRepository: Repository<Car>,

    private readonly reviewsService: ReviewsService,
  ) {}

  // The user's favorite cars, most recently saved first, shaped like the
  // cars list (photos, category and rating)
  async findAll(userId: number) {
    const favorites = await this.favoritesRepository.find({
      where: { userId },
      relations: { car: { category: true, images: true } },
      order: { createdAt: 'DESC', car: { images: { createdAt: 'ASC' } } },
    });

    const cars = favorites.map((favorite) => favorite.car);
    const ratings = await this.reviewsService.getRatings(
      cars.map((car) => car.id),
    );

    return cars.map((car) => ({ ...car, ...ratings.get(car.id) }));
  }

  // Only the ids, so every car card can show a filled heart cheaply
  async findIds(userId: number): Promise<number[]> {
    const favorites = await this.favoritesRepository.find({
      select: { carId: true },
      where: { userId },
    });

    return favorites.map((favorite) => favorite.carId);
  }

  // Saving a car twice is not an error: it is simply already saved
  async add(userId: number, carId: number): Promise<void> {
    const carExists = await this.carsRepository.exists({
      where: { id: carId },
    });

    if (!carExists) {
      throw new NotFoundException('Car not found');
    }

    await this.favoritesRepository
      .createQueryBuilder()
      .insert()
      .values({ userId, carId })
      .orIgnore()
      .execute();
  }

  async remove(userId: number, carId: number): Promise<void> {
    await this.favoritesRepository.delete({ userId, carId });
  }
}
