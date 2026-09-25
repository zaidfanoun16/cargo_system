import { BadRequestException, ConflictException } from '@nestjs/common';
import { In, Not } from 'typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Car } from './entities/car.entity';
import { CarCategory } from '../car-categories/entities/car-category.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { CarsService } from './cars.service';
import { ReviewsService } from '../reviews/reviews.service';

describe('CarsService', () => {
  let service: CarsService;

  const carsRepository = {
    findOne: jest.fn(),
    remove: jest.fn(),
    findAndCount: jest.fn(),
  };
  const reservationsRepository = { count: jest.fn(), find: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CarsService,
        { provide: getRepositoryToken(Car), useValue: carsRepository },
        { provide: getRepositoryToken(CarCategory), useValue: {} },
        {
          provide: getRepositoryToken(Reservation),
          useValue: reservationsRepository,
        },
        {
          provide: ReviewsService,
          useValue: { getRatings: async () => new Map() },
        },
      ],
    }).compile();

    service = module.get<CarsService>(CarsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('remove', () => {
    beforeEach(() => {
      carsRepository.findOne.mockResolvedValue({ id: 5 });
    });

    it('deletes a car without reservations', async () => {
      reservationsRepository.count.mockResolvedValue(0);

      await service.remove(5);

      expect(carsRepository.remove).toHaveBeenCalled();
    });

    it('refuses to delete a car with reservations', async () => {
      reservationsRepository.count.mockResolvedValue(1);

      await expect(service.remove(5)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(carsRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('getAvailability', () => {
    beforeEach(() => {
      carsRepository.findOne.mockResolvedValue({ id: 5, status: 'AVAILABLE' });
    });

    it('lists every day of the month that is at least partly reserved', async () => {
      reservationsRepository.find.mockResolvedValue([
        // Starts in September, ends October 3 at midnight
        {
          startDate: new Date('2030-09-28T00:00:00Z'),
          endDate: new Date('2030-10-03T00:00:00Z'),
          status: 'CONFIRMED',
        },
        // Part of a day still blocks that day
        {
          startDate: new Date('2030-10-10T14:00:00Z'),
          endDate: new Date('2030-10-11T10:00:00Z'),
          status: 'PENDING',
        },
      ]);

      const calendar = await service.getAvailability(5, '2030-10');

      expect(calendar.month).toBe('2030-10');
      expect(calendar.bookedPeriods).toHaveLength(2);
      expect(calendar.bookedDates).toEqual([
        '2030-10-01',
        '2030-10-02',
        '2030-10-10',
        '2030-10-11',
      ]);
    });

    it('returns an empty calendar when nothing is reserved', async () => {
      reservationsRepository.find.mockResolvedValue([]);

      const calendar = await service.getAvailability(5, '2030-02');

      expect(calendar).toMatchObject({
        carId: 5,
        month: '2030-02',
        bookedPeriods: [],
        bookedDates: [],
      });
    });
  });

  describe('findAll by dates', () => {
    beforeEach(() => {
      carsRepository.findAndCount.mockResolvedValue([[], 0]);
    });

    const whereOfLastSearch = () =>
      carsRepository.findAndCount.mock.calls[0][0].where;

    it('excludes cars reserved in the period and unavailable cars', async () => {
      reservationsRepository.find.mockResolvedValue([
        { carId: 1 },
        { carId: 2 },
        { carId: 1 },
      ]);

      await service.findAll({
        startDate: '2030-10-10',
        endDate: '2030-10-15',
      });

      expect(whereOfLastSearch()).toMatchObject({
        status: 'AVAILABLE',
        id: Not(In([1, 2])),
      });
    });

    it('does not filter by reservations without dates', async () => {
      await service.findAll({});

      expect(reservationsRepository.find).not.toHaveBeenCalled();
      expect(whereOfLastSearch().id).toBeUndefined();
    });

    it('requires both dates', async () => {
      await expect(
        service.findAll({ startDate: '2030-10-10' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('requires endDate after startDate', async () => {
      await expect(
        service.findAll({ startDate: '2030-10-15', endDate: '2030-10-10' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
