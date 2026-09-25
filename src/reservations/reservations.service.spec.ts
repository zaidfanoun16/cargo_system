import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Reservation } from './entities/reservation.entity';
import { User } from '../users/entities/user.entity';
import { Car } from '../cars/entities/car.entity';
import { ReservationsService } from './reservations.service';
import { EmailService } from '../email/email.service';

describe('ReservationsService', () => {
  let service: ReservationsService;

  const reservationsRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const carsRepository = { findOne: jest.fn() };
  const emailService = { sendReservationStatus: jest.fn() };

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
        { provide: EmailService, useValue: emailService },
        { provide: ConfigService, useValue: { get: () => undefined } },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    beforeEach(() => {
      // PostgreSQL returns decimals as strings
      carsRepository.findOne.mockResolvedValue({ id: 5, pricePerDay: '50.00' });
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

    it('stores the total price for the reserved days', async () => {
      reservationsRepository.findOne.mockResolvedValue(null);

      // 2030-10-12 → 2030-10-18 is 6 days at 50/day
      await expect(service.create(dto, currentUser)).resolves.toMatchObject({
        totalPrice: 300,
      });
    });

    it('rounds a partial day up and keeps cents exact', async () => {
      reservationsRepository.findOne.mockResolvedValue(null);
      carsRepository.findOne.mockResolvedValue({ id: 5, pricePerDay: '19.99' });

      // 2 days and 1 hour counts as 3 days
      await expect(
        service.create(
          {
            carId: 5,
            startDate: '2030-10-12T10:00:00Z',
            endDate: '2030-10-14T11:00:00Z',
          },
          currentUser,
        ),
      ).resolves.toMatchObject({ totalPrice: 59.97 });
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

  describe('status emails', () => {
    const reservation = {
      id: 7,
      userId: 1,
      status: 'PENDING',
      startDate: new Date('2030-10-12'),
      endDate: new Date('2030-10-18'),
      totalPrice: 300,
    };

    const withRelations = (status: string) => ({
      ...reservation,
      status,
      user: { email: 'a@b.com', fullName: 'A' },
      car: { brand: 'Toyota', model: 'Corolla' },
    });

    beforeEach(() => {
      reservationsRepository.save.mockImplementation(async (r) => r);
    });

    it('emails the user when a reservation is confirmed', async () => {
      reservationsRepository.findOne
        .mockResolvedValueOnce({ ...reservation })
        .mockResolvedValueOnce(withRelations('CONFIRMED'));

      await service.confirm(7);

      expect(emailService.sendReservationStatus).toHaveBeenCalledWith(
        'a@b.com',
        expect.objectContaining({
          reservationId: 7,
          status: 'CONFIRMED',
          car: 'Toyota Corolla',
          totalPrice: 300,
        }),
      );
    });

    it('still confirms the reservation when the email fails', async () => {
      reservationsRepository.findOne
        .mockResolvedValueOnce({ ...reservation })
        .mockResolvedValueOnce(withRelations('CONFIRMED'));
      emailService.sendReservationStatus.mockRejectedValue(
        new Error('Resend is down'),
      );

      await expect(service.confirm(7)).resolves.toMatchObject({
        status: 'CONFIRMED',
      });
    });
  });

  describe('expirePendingReservations', () => {
    // Freeze the clock so the time limits can be checked exactly
    const now = new Date('2030-01-15T12:00:00Z');

    afterEach(() => jest.useRealTimers());

    beforeEach(() => {
      jest.useFakeTimers({ now });
      reservationsRepository.save.mockImplementation(async (r) => r);
      reservationsRepository.findOne.mockResolvedValue(null);
    });

    it('cancels expired PENDING reservations', async () => {
      const expired = [
        { id: 1, status: 'PENDING' },
        { id: 2, status: 'PENDING' },
      ];
      reservationsRepository.find.mockResolvedValue(expired);

      await expect(service.expirePendingReservations()).resolves.toBe(2);

      expect(expired.every((r) => r.status === 'CANCELLED')).toBe(true);
      expect(reservationsRepository.save).toHaveBeenCalledTimes(2);
    });

    it('looks for reservations older than 24 hours or already started', async () => {
      reservationsRepository.find.mockResolvedValue([]);

      await service.expirePendingReservations();

      const [byAge, byStart] =
        reservationsRepository.find.mock.calls[0][0].where;
      const createdBefore: Date = byAge.createdAt.value;
      const startedBy: Date = byStart.startDate.value;

      expect(byAge.status).toBe('PENDING');
      expect(byStart.status).toBe('PENDING');
      expect(createdBefore).toEqual(new Date('2030-01-14T12:00:00Z'));
      expect(startedBy).toEqual(now);
    });
  });
});
