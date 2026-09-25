import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Reservation } from './entities/reservation.entity';
import { User } from '../users/entities/user.entity';
import { Car } from '../cars/entities/car.entity';
import { ReservationsService } from './reservations.service';

describe('ReservationsService', () => {
  let service: ReservationsService;

  const reservationsRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const carsRepository = { findOne: jest.fn() };

  const currentUser = { userId: 1, email: 'a@b.com', role: 'USER' };
  const dto = {
    carId: 5,
    startDate: '2030-10-12',
    endDate: '2030-10-18',
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        { provide: getRepositoryToken(Reservation), useValue: reservationsRepository },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(Car), useValue: carsRepository },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    beforeEach(() => {
      carsRepository.findOne.mockResolvedValue({ id: 5 });
      reservationsRepository.create.mockImplementation((data) => data);
      reservationsRepository.save.mockImplementation(async (data) => data);
    });

    it('creates the reservation when the car is free', async () => {
      reservationsRepository.findOne.mockResolvedValue(null);

      await expect(service.create(dto, currentUser)).resolves.toMatchObject({
        userId: 1,
        carId: 5,
      });
      expect(reservationsRepository.save).toHaveBeenCalled();
    });

    it('rejects dates that overlap an active reservation', async () => {
      reservationsRepository.findOne.mockResolvedValue({ id: 99 });

      await expect(service.create(dto, currentUser)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(reservationsRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('ownership', () => {
    const otherUsersReservation = {
      id: 7,
      userId: 2,
      status: 'PENDING',
      startDate: new Date('2030-10-12'),
      endDate: new Date('2030-10-18'),
    };

    it("forbids a user from viewing another user's reservation", async () => {
      reservationsRepository.findOne.mockResolvedValue(otherUsersReservation);

      await expect(service.getOne(7, 1, 'USER')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("forbids a user from cancelling another user's reservation", async () => {
      reservationsRepository.findOne.mockResolvedValue(otherUsersReservation);

      await expect(service.cancel(7, 1, 'USER')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(reservationsRepository.save).not.toHaveBeenCalled();
    });
  });
});
