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
        {
          provide: getRepositoryToken(Reservation),
          useValue: reservationsRepository,
        },
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

  describe('hourly pricing', () => {
    beforeEach(() => {
      reservationsRepository.findOne.mockResolvedValue(null);
      reservationsRepository.create.mockImplementation((data) => data);
      reservationsRepository.save.mockImplementation(async (data) => data);
    });

    // 50/day and 8/hour: hours are cheaper up to 6 hours (48 < 50)
    const priceOf = async (
      startDate: string,
      endDate: string,
      pricePerHour: string | null = '8.00',
    ) => {
      carsRepository.findOne.mockResolvedValue({
        id: 5,
        pricePerDay: '50.00',
        pricePerHour,
      });

      const reservation = await service.create(
        { carId: 5, startDate, endDate },
        currentUser,
      );

      return reservation.totalPrice;
    };

    it('charges by the hour for a short rental', async () => {
      // 5 hours x 8 = 40
      await expect(
        priceOf('2030-10-12T09:00:00Z', '2030-10-12T14:00:00Z'),
      ).resolves.toBe(40);
    });

    it('charges one day when the hours would cost more', async () => {
      // 10 hours x 8 = 80 > 50
      await expect(
        priceOf('2030-10-12T09:00:00Z', '2030-10-12T19:00:00Z'),
      ).resolves.toBe(50);
    });

    it('adds leftover hours to full days', async () => {
      // 2 days + 3 hours = 100 + 24
      await expect(
        priceOf('2030-10-12T09:00:00Z', '2030-10-14T12:00:00Z'),
      ).resolves.toBe(124);
    });

    it('rents by the day when the car has no hourly price', async () => {
      // 5 hours of a day-only car = 1 day
      await expect(
        priceOf('2030-10-12T09:00:00Z', '2030-10-12T14:00:00Z', null),
      ).resolves.toBe(50);
    });

    it('rejects times that are not on the hour', async () => {
      await expect(
        priceOf('2030-10-12T09:15:00Z', '2030-10-12T14:00:00Z'),
      ).rejects.toThrow('on the hour');
    });

    it('rejects reservations shorter than 2 hours', async () => {
      await expect(
        priceOf('2030-10-12T09:00:00Z', '2030-10-12T10:00:00Z'),
      ).rejects.toThrow('at least 2 hours');
    });
  });

  describe('duration discounts', () => {
    beforeEach(() => {
      reservationsRepository.findOne.mockResolvedValue(null);
      reservationsRepository.create.mockImplementation((data) => data);
      reservationsRepository.save.mockImplementation(async (data) => data);
      carsRepository.findOne.mockResolvedValue({
        id: 5,
        pricePerDay: '33.33',
        pricePerHour: null,
      });
    });

    const book = (startDate: string, endDate: string) =>
      service.create({ carId: 5, startDate, endDate }, currentUser);

    it('gives no discount under 7 days', async () => {
      await expect(book('2030-10-01', '2030-10-07')).resolves.toMatchObject({
        basePrice: 199.98,
        discountPercent: 0,
        totalPrice: 199.98,
      });
    });

    it('gives 10% from 7 days', async () => {
      // 7 x 33.33 = 233.31, minus 10% = 209.979 → 209.98
      await expect(book('2030-10-01', '2030-10-08')).resolves.toMatchObject({
        basePrice: 233.31,
        discountPercent: 10,
        totalPrice: 209.98,
      });
    });

    it('gives 20% from 30 days', async () => {
      // 30 x 33.33 = 999.9, minus 20% = 799.92
      await expect(book('2030-10-01', '2030-10-31')).resolves.toMatchObject({
        basePrice: 999.9,
        discountPercent: 20,
        totalPrice: 799.92,
      });
    });
  });

  describe('quote', () => {
    beforeEach(() => {
      carsRepository.findOne.mockResolvedValue({
        id: 5,
        pricePerDay: '100.00',
        pricePerHour: '15.00',
        status: 'AVAILABLE',
      });
    });

    it('prices a free period without creating a reservation', async () => {
      reservationsRepository.findOne.mockResolvedValue(null);

      // 7 days at 100/day, minus 10%
      await expect(
        service.quote({
          carId: 5,
          startDate: '2030-10-01T10:00:00Z',
          endDate: '2030-10-08T10:00:00Z',
        }),
      ).resolves.toMatchObject({
        hours: 168,
        available: true,
        unavailableReason: null,
        basePrice: 700,
        discountPercent: 10,
        totalPrice: 630,
      });
      expect(reservationsRepository.save).not.toHaveBeenCalled();
    });

    it('still prices a reserved period but marks it unavailable', async () => {
      reservationsRepository.findOne.mockResolvedValue({ id: 99 });

      await expect(
        service.quote({
          carId: 5,
          startDate: '2030-10-01T10:00:00Z',
          endDate: '2030-10-01T13:00:00Z',
        }),
      ).resolves.toMatchObject({
        hours: 3,
        available: false,
        unavailableReason: 'reserved',
        totalPrice: 45,
      });
    });

    it('marks a car in maintenance unavailable', async () => {
      carsRepository.findOne.mockResolvedValue({
        id: 5,
        pricePerDay: '100.00',
        pricePerHour: null,
        status: 'MAINTENANCE',
      });

      await expect(
        service.quote({
          carId: 5,
          startDate: '2030-10-01',
          endDate: '2030-10-03',
        }),
      ).resolves.toMatchObject({
        available: false,
        unavailableReason: 'maintenance',
        totalPrice: 200,
      });
    });

    it('applies the same checks as booking', async () => {
      await expect(
        service.quote({
          carId: 5,
          startDate: '2030-10-01T10:00:00Z',
          endDate: '2030-10-01T11:00:00Z',
        }),
      ).rejects.toThrow('at least 2 hours');
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
