import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Reservation } from './entities/reservation.entity';
import { User } from '../users/entities/user.entity';
import { Car } from '../cars/entities/car.entity';
import { Review } from '../reviews/entities/review.entity';
import { ReservationsService } from './reservations.service';
import { EmailService } from '../email/email.service';

describe('ReservationsService', () => {
  let service: ReservationsService;

  const reservationsRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
  };
  const usersRepository = { findOne: jest.fn(), update: jest.fn() };
  const carsRepository = { findOne: jest.fn() };
  const reviewsRepository = { find: jest.fn() };
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
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: getRepositoryToken(Car), useValue: carsRepository },
        { provide: getRepositoryToken(Review), useValue: reviewsRepository },
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
      usersRepository.findOne.mockResolvedValue({ id: 1, bookingBlocked: false });
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

    it('refuses a user who is blocked from booking', async () => {
      usersRepository.findOne.mockResolvedValue({ id: 1, bookingBlocked: true });

      await expect(service.create(dto, currentUser)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(reservationsRepository.save).not.toHaveBeenCalled();
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

  describe('getMyReservations', () => {
    it('marks the reservations that already have a review', async () => {
      reservationsRepository.find.mockResolvedValue([
        { id: 7, status: 'COMPLETED' },
        { id: 8, status: 'COMPLETED' },
        { id: 9, status: 'PENDING' },
      ]);
      reviewsRepository.find.mockResolvedValue([{ reservationId: 8 }]);

      const reservations = await service.getMyReservations(1);

      expect(reservations.map((r) => [r.id, r.reviewed])).toEqual([
        [7, false],
        [8, true],
        [9, false],
      ]);
      expect(reservationsRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 1 } }),
      );
    });

    it('says until when each reservation can be cancelled', async () => {
      const startDate = new Date('2030-10-12T10:00:00Z');
      reservationsRepository.find.mockResolvedValue([
        { id: 7, status: 'CONFIRMED', startDate },
        { id: 8, status: 'PENDING', startDate },
        { id: 9, status: 'COMPLETED', startDate },
      ]);
      reviewsRepository.find.mockResolvedValue([]);

      const [confirmed, pending, completed] =
        await service.getMyReservations(1);

      expect(confirmed.cancellation).toEqual({
        freeUntil: new Date('2030-10-11T10:00:00Z'),
        until: new Date('2030-10-12T08:00:00Z'),
      });
      expect(pending.cancellation).toEqual({
        freeUntil: startDate,
        until: startDate,
      });
      expect(completed.cancellation).toBeNull();
    });

    it('skips the review lookup when there are no reservations', async () => {
      reservationsRepository.find.mockResolvedValue([]);

      await expect(service.getMyReservations(1)).resolves.toEqual([]);
      expect(reviewsRepository.find).not.toHaveBeenCalled();
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
      basePrice: 300,
      discountPercent: 0,
      user: { email: 'a@b.com', fullName: 'A' },
      car: { brand: 'Toyota', model: 'Corolla', licensePlate: 'AB-1' },
    });

    beforeEach(() => {
      reservationsRepository.save.mockImplementation(async (r) => r);
    });

    it('emails the user when a reservation is confirmed', async () => {
      reservationsRepository.findOne
        .mockResolvedValueOnce({ ...reservation })
        // The new handover code is free
        .mockResolvedValueOnce(null)
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

    it('uses the Arabic car name in the email when it is set', async () => {
      reservationsRepository.findOne
        .mockResolvedValueOnce({ ...reservation })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          ...withRelations('CONFIRMED'),
          car: {
            brand: 'Toyota',
            brandAr: 'تويوتا',
            model: 'Corolla',
            modelAr: 'كورولا',
            licensePlate: 'AB-1',
          },
        });

      await service.confirm(7);

      expect(emailService.sendReservationStatus).toHaveBeenCalledWith(
        'a@b.com',
        expect.objectContaining({ car: 'تويوتا كورولا', licensePlate: 'AB-1' }),
      );
    });

    it.each([
      ['the customer', { userId: 1, role: 'USER' }, 'user'],
      ['an admin', { userId: 9, role: 'ADMIN' }, 'admin'],
    ])('tells the user when %s cancels', async (_who, by, cancelledBy) => {
      jest.useFakeTimers({ now: new Date('2030-10-01T00:00:00Z') });
      reservationsRepository.findOne
        .mockResolvedValueOnce({ ...reservation })
        .mockResolvedValueOnce(withRelations('CANCELLED'));

      await service.cancel(7, by.userId, by.role);

      expect(emailService.sendReservationStatus).toHaveBeenCalledWith(
        'a@b.com',
        expect.objectContaining({ status: 'CANCELLED', cancelledBy }),
      );
      jest.useRealTimers();
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
  describe('cancellation policy', () => {
    // Pickup is on 2030-10-12 at 10:00
    const startDate = new Date('2030-10-12T10:00:00Z');

    const confirmed = () => ({
      id: 7,
      userId: 1,
      status: 'CONFIRMED',
      lateCancellation: false,
      startDate,
      endDate: new Date('2030-10-14T10:00:00Z'),
    });

    afterEach(() => jest.useRealTimers());

    beforeEach(() => {
      reservationsRepository.save.mockImplementation(async (r) => r);
      usersRepository.findOne.mockResolvedValue({ id: 1, bookingBlocked: false });
      reservationsRepository.count.mockResolvedValue(0);
    });

    it('cancels for free more than 24 hours before pickup', async () => {
      jest.useFakeTimers({ now: new Date('2030-10-11T09:00:00Z') });
      reservationsRepository.findOne.mockResolvedValue(confirmed());

      await expect(service.cancel(7, 1, 'USER')).resolves.toMatchObject({
        status: 'CANCELLED',
        lateCancellation: false,
      });
      expect(reservationsRepository.count).not.toHaveBeenCalled();
    });

    it('counts a cancellation in the last 24 hours as late', async () => {
      jest.useFakeTimers({ now: new Date('2030-10-11T11:00:00Z') });
      reservationsRepository.findOne.mockResolvedValue(confirmed());

      await expect(service.cancel(7, 1, 'USER')).resolves.toMatchObject({
        status: 'CANCELLED',
        lateCancellation: true,
      });
    });

    it('refuses to cancel online in the last 2 hours', async () => {
      jest.useFakeTimers({ now: new Date('2030-10-12T08:30:00Z') });
      const reservation = confirmed();
      reservationsRepository.findOne.mockResolvedValue(reservation);

      await expect(service.cancel(7, 1, 'USER')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(reservation.status).toBe('CONFIRMED');
      expect(reservationsRepository.save).not.toHaveBeenCalled();
    });

    it('lets an admin cancel in the last 2 hours without a strike', async () => {
      jest.useFakeTimers({ now: new Date('2030-10-12T08:30:00Z') });
      reservationsRepository.findOne.mockResolvedValue(confirmed());

      await expect(service.cancel(7, 9, 'ADMIN')).resolves.toMatchObject({
        status: 'CANCELLED',
        lateCancellation: false,
      });
    });

    it('lets a PENDING reservation be cancelled for free until pickup', async () => {
      jest.useFakeTimers({ now: new Date('2030-10-12T09:00:00Z') });
      reservationsRepository.findOne.mockResolvedValue({
        ...confirmed(),
        status: 'PENDING',
      });

      await expect(service.cancel(7, 1, 'USER')).resolves.toMatchObject({
        status: 'CANCELLED',
        lateCancellation: false,
      });
    });

    it('blocks the user after 3 late cancellations', async () => {
      jest.useFakeTimers({ now: new Date('2030-10-11T11:00:00Z') });
      reservationsRepository.findOne.mockResolvedValue(confirmed());
      // 3 late cancellations, no no-shows
      reservationsRepository.count
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(0);

      await service.cancel(7, 1, 'USER');

      expect(usersRepository.update).toHaveBeenCalledWith(1, {
        bookingBlocked: true,
      });
    });

    it('does not block after 2 late cancellations', async () => {
      jest.useFakeTimers({ now: new Date('2030-10-11T11:00:00Z') });
      reservationsRepository.findOne.mockResolvedValue(confirmed());
      reservationsRepository.count
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(0);

      await service.cancel(7, 1, 'USER');

      expect(usersRepository.update).not.toHaveBeenCalled();
    });

    it('only counts strikes since an admin last allowed the user', async () => {
      jest.useFakeTimers({ now: new Date('2030-10-11T11:00:00Z') });
      const resetAt = new Date('2030-10-01T00:00:00Z');
      usersRepository.findOne.mockResolvedValue({
        id: 1,
        bookingBlocked: false,
        strikesResetAt: resetAt,
      });
      reservationsRepository.findOne.mockResolvedValue(confirmed());

      await service.cancel(7, 1, 'USER');

      const [lateQuery] = reservationsRepository.count.mock.calls[0];
      expect(lateQuery.where.cancelledAt.value).toEqual(resetAt);
    });
  });

  describe('pickup and return', () => {
    const reservation = () => ({
      id: 7,
      userId: 1,
      status: 'CONFIRMED',
      startDate: new Date('2030-10-12T10:00:00Z'),
      endDate: new Date('2030-10-14T10:00:00Z'),
    });

    afterEach(() => jest.useRealTimers());

    beforeEach(() => {
      reservationsRepository.save.mockImplementation(async (r) => r);
    });

    it('refuses to hand the car over more than an hour early', async () => {
      jest.useFakeTimers({ now: new Date('2030-10-12T08:30:00Z') });
      reservationsRepository.findOne.mockResolvedValue(reservation());

      await expect(service.pickUp(7)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('hands the car over from an hour before pickup', async () => {
      const now = new Date('2030-10-12T09:15:00Z');
      jest.useFakeTimers({ now });
      reservationsRepository.findOne.mockResolvedValue(reservation());

      await expect(service.pickUp(7)).resolves.toMatchObject({
        status: 'PICKED_UP',
        pickedUpAt: now,
      });
    });

    it('only completes a reservation whose car was picked up', async () => {
      reservationsRepository.findOne.mockResolvedValue(reservation());

      await expect(service.complete(7)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('accepts the car back before the end date', async () => {
      jest.useFakeTimers({ now: new Date('2030-10-13T10:00:00Z') });
      reservationsRepository.findOne.mockResolvedValue({
        ...reservation(),
        status: 'PICKED_UP',
      });

      await expect(service.complete(7)).resolves.toMatchObject({
        status: 'COMPLETED',
        returnedAt: new Date('2030-10-13T10:00:00Z'),
      });
    });
  });

  describe('markNoShows', () => {
    const now = new Date('2030-01-15T12:00:00Z');

    afterEach(() => jest.useRealTimers());

    beforeEach(() => {
      jest.useFakeTimers({ now });
      reservationsRepository.save.mockImplementation(async (r) => r);
      reservationsRepository.findOne.mockResolvedValue(null);
      usersRepository.findOne.mockResolvedValue({ id: 1, bookingBlocked: false });
      reservationsRepository.count.mockResolvedValue(0);
    });

    it('marks confirmed reservations not picked up an hour after pickup', async () => {
      const missed = [{ id: 1, userId: 1, status: 'CONFIRMED' }];
      reservationsRepository.find.mockResolvedValue(missed);

      await expect(service.markNoShows()).resolves.toBe(1);

      expect(missed[0].status).toBe('NO_SHOW');
      const { where } = reservationsRepository.find.mock.calls[0][0];
      expect(where.status).toBe('CONFIRMED');
      expect(where.startDate.value).toEqual(new Date('2030-01-15T11:00:00Z'));
    });

    it('blocks the user after 2 no-shows', async () => {
      reservationsRepository.find.mockResolvedValue([
        { id: 1, userId: 1, status: 'CONFIRMED' },
      ]);
      reservationsRepository.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(2);

      await service.markNoShows();

      expect(usersRepository.update).toHaveBeenCalledWith(1, {
        bookingBlocked: true,
      });
    });
  });
  describe('handover code', () => {
    afterEach(() => jest.useRealTimers());

    beforeEach(() => {
      reservationsRepository.save.mockImplementation(async (r) => r);
    });

    it('gives a confirmed reservation a 6-digit code', async () => {
      reservationsRepository.findOne
        .mockResolvedValueOnce({ id: 7, status: 'PENDING' })
        .mockResolvedValue(null);

      const confirmed = await service.confirm(7);

      expect(confirmed.handoverCode).toMatch(/^\d{6}$/);
    });

    it('picks another code when one is taken', async () => {
      reservationsRepository.findOne
        .mockResolvedValueOnce({ id: 7, status: 'PENDING' })
        // First code taken by another confirmed reservation
        .mockResolvedValueOnce({ id: 8 })
        .mockResolvedValue(null);

      await service.confirm(7);

      const [first, second] = reservationsRepository.findOne.mock.calls
        .slice(1, 3)
        .map(([options]) => options.where.handoverCode);
      expect(first).not.toBe(second);
    });

    it('only shows the code while the reservation is confirmed', async () => {
      reservationsRepository.find.mockResolvedValue([
        { id: 7, status: 'CONFIRMED', handoverCode: '123456' },
        { id: 8, status: 'PICKED_UP', handoverCode: '654321' },
      ]);
      reviewsRepository.find.mockResolvedValue([]);

      const [confirmed, pickedUp] = await service.getMyReservations(1);

      expect(confirmed.handoverCode).toBe('123456');
      expect(pickedUp.handoverCode).toBeNull();
    });

    it('rejects an unknown code', async () => {
      reservationsRepository.findOne.mockResolvedValue(null);

      await expect(service.findByHandoverCode('000000')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('says when the car was already handed over', async () => {
      reservationsRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 7, status: 'PICKED_UP' });

      await expect(service.findByHandoverCode('123456')).rejects.toThrow(
        'This car was already handed over',
      );
    });

    it('hands the car over to the customer who shows the code', async () => {
      const now = new Date('2030-10-12T09:30:00Z');
      jest.useFakeTimers({ now });
      const reservation = {
        id: 7,
        status: 'CONFIRMED',
        handoverCode: '123456',
        startDate: new Date('2030-10-12T10:00:00Z'),
        endDate: new Date('2030-10-14T10:00:00Z'),
      };
      reservationsRepository.findOne.mockResolvedValue(reservation);

      await expect(service.handOver('123456')).resolves.toMatchObject({
        status: 'PICKED_UP',
        pickedUpAt: now,
      });
      expect(reservationsRepository.findOne.mock.calls[0][0].where).toEqual({
        handoverCode: '123456',
        status: 'CONFIRMED',
      });
    });
  });
});
