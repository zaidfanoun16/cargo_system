import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { FavoritesService } from './favorites.service';
import { Favorite } from './entities/favorite.entity';
import { Car } from '../cars/entities/car.entity';
import { ReviewsService } from '../reviews/reviews.service';

describe('FavoritesService', () => {
  let service: FavoritesService;

  const insert = {
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    orIgnore: jest.fn().mockReturnThis(),
    execute: jest.fn(),
  };
  const favoritesRepository = {
    find: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(() => insert),
  };
  const carsRepository = { exists: jest.fn() };
  const reviewsService = { getRatings: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoritesService,
        {
          provide: getRepositoryToken(Favorite),
          useValue: favoritesRepository,
        },
        { provide: getRepositoryToken(Car), useValue: carsRepository },
        { provide: ReviewsService, useValue: reviewsService },
      ],
    }).compile();

    service = module.get(FavoritesService);
  });

  it('lists the favorite cars with their ratings', async () => {
    favoritesRepository.find.mockResolvedValue([
      { car: { id: 3, brand: 'Kia' } },
      { car: { id: 7, brand: 'Audi' } },
    ]);
    reviewsService.getRatings.mockResolvedValue(
      new Map([
        [3, { averageRating: null, reviewsCount: 0 }],
        [7, { averageRating: 4.5, reviewsCount: 2 }],
      ]),
    );

    await expect(service.findAll(1)).resolves.toEqual([
      { id: 3, brand: 'Kia', averageRating: null, reviewsCount: 0 },
      { id: 7, brand: 'Audi', averageRating: 4.5, reviewsCount: 2 },
    ]);
    expect(favoritesRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 1 } }),
    );
  });

  it('returns only the ids', async () => {
    favoritesRepository.find.mockResolvedValue([{ carId: 3 }, { carId: 7 }]);

    await expect(service.findIds(1)).resolves.toEqual([3, 7]);
  });

  it('saves a car, ignoring one that is already saved', async () => {
    carsRepository.exists.mockResolvedValue(true);

    await service.add(1, 7);

    expect(insert.values).toHaveBeenCalledWith({ userId: 1, carId: 7 });
    expect(insert.orIgnore).toHaveBeenCalled();
  });

  it('refuses a car that does not exist', async () => {
    carsRepository.exists.mockResolvedValue(false);

    await expect(service.add(1, 99)).rejects.toBeInstanceOf(NotFoundException);
    expect(insert.execute).not.toHaveBeenCalled();
  });

  it("removes only the user's own favorite", async () => {
    await service.remove(1, 7);

    expect(favoritesRepository.delete).toHaveBeenCalledWith({
      userId: 1,
      carId: 7,
    });
  });
});
