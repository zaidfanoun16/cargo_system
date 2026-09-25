import {
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReviewsService } from './reviews.service';
import { Review } from './entities/review.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Car } from '../cars/entities/car.entity';

describe('ReviewsService', () => {
  let service: ReviewsService;

  const reviewsRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const reservationsRepository = { findOne: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: getRepositoryToken(Review), useValue: reviewsRepository },
        {
          provide: getRepositoryToken(Reservation),
          useValue: reservationsRepository,
        },
        { provide: getRepositoryToken(Car), useValue: {} },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);

    reviewsRepository.create.mockImplementation((data) => data);
    reviewsRepository.save.mockImplementation(async (data) => data);
  });

  const completedReservation = {
    id: 7,
    userId: 1,
    carId: 5,
    status: 'COMPLETED',
  };

  describe('create', () => {
    it('saves a review for the renter of a completed reservation', async () => {
      reservationsRepository.findOne.mockResolvedValue(completedReservation);
      reviewsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(7, 1, { rating: 4, comment: 'Great' }),
      ).resolves.toMatchObject({
        rating: 4,
        comment: 'Great',
        reservationId: 7,
        userId: 1,
        carId: 5,
      });
    });

    it("rejects someone else's reservation", async () => {
      reservationsRepository.findOne.mockResolvedValue(completedReservation);

      await expect(service.create(7, 2, { rating: 4 })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('rejects a reservation that is not completed', async () => {
      reservationsRepository.findOne.mockResolvedValue({
        ...completedReservation,
        status: 'CONFIRMED',
      });

      await expect(service.create(7, 1, { rating: 4 })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('rejects a second review of the same reservation', async () => {
      reservationsRepository.findOne.mockResolvedValue(completedReservation);
      reviewsRepository.findOne.mockResolvedValue({ id: 1 });

      await expect(service.create(7, 1, { rating: 4 })).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(reviewsRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getRatings', () => {
    it('rounds the average and fills in cars without reviews', async () => {
      const query = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ carId: 1, average: '4.3333', count: '3' }]),
      };
      reviewsRepository.createQueryBuilder.mockReturnValue(query);

      const ratings = await service.getRatings([1, 2]);

      expect(ratings.get(1)).toEqual({ averageRating: 4.3, reviewsCount: 3 });
      expect(ratings.get(2)).toEqual({ averageRating: null, reviewsCount: 0 });
    });
  });
});
