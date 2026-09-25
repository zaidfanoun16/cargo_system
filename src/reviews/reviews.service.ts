import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { Reservation } from '../reservations/entities/reservation.entity';
import { ReservationStatus } from '../reservations/enums/reservation-status.enum';
import { Car } from '../cars/entities/car.entity';

export type CarRating = {
  averageRating: number | null;
  reviewsCount: number;
};

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewsRepository: Repository<Review>,

    @InjectRepository(Reservation)
    private readonly reservationsRepository: Repository<Reservation>,

    @InjectRepository(Car)
    private readonly carsRepository: Repository<Car>,
  ) {}

  // Only the renter can review, once, after the reservation is completed,
  // so every review comes from someone who actually drove the car
  async create(
    reservationId: number,
    userId: number,
    createReviewDto: CreateReviewDto,
  ) {
    const reservation = await this.reservationsRepository.findOne({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.userId !== userId) {
      throw new ForbiddenException(
        'You can only review your own reservations',
      );
    }

    if (reservation.status !== ReservationStatus.COMPLETED) {
      throw new ConflictException(
        'Only completed reservations can be reviewed',
      );
    }

    const existingReview = await this.reviewsRepository.findOne({
      where: { reservationId },
    });

    if (existingReview) {
      throw new ConflictException('This reservation was already reviewed');
    }

    const review = this.reviewsRepository.create({
      rating: createReviewDto.rating,
      comment: createReviewDto.comment ?? null,
      reservationId,
      userId,
      carId: reservation.carId,
    });

    return this.reviewsRepository.save(review);
  }

  // Public list of a car's reviews, newest first. Only the reviewer's
  // name is shown, never their email.
  async findForCar(carId: number) {
    const car = await this.carsRepository.findOne({
      where: { id: carId },
    });

    if (!car) {
      throw new NotFoundException(`Car with ID ${carId} not found`);
    }

    const reviews = await this.reviewsRepository.find({
      where: { carId },
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });

    return {
      ...(await this.getRatings([carId])).get(carId),
      reviews: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        reviewer: review.user.fullName,
        createdAt: review.createdAt,
      })),
    };
  }

  // ADMIN: remove an inappropriate review
  async remove(id: number): Promise<void> {
    const review = await this.reviewsRepository.findOne({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    await this.reviewsRepository.remove(review);
  }

  // Average rating (rounded to 1 decimal, null without reviews) and
  // review count for each of the given cars
  async getRatings(carIds: number[]): Promise<Map<number, CarRating>> {
    const ratings = new Map<number, CarRating>(
      carIds.map((id) => [id, { averageRating: null, reviewsCount: 0 }]),
    );

    if (carIds.length === 0) {
      return ratings;
    }

    const rows: { carId: number; average: string; count: string }[] =
      await this.reviewsRepository
        .createQueryBuilder('review')
        .select('review.carId', 'carId')
        .addSelect('AVG(review.rating)', 'average')
        .addSelect('COUNT(*)', 'count')
        .where({ carId: In(carIds) })
        .groupBy('review.carId')
        .getRawMany();

    for (const row of rows) {
      ratings.set(Number(row.carId), {
        averageRating: Math.round(Number(row.average) * 10) / 10,
        reviewsCount: Number(row.count),
      });
    }

    return ratings;
  }
}
