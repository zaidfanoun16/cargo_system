import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { randomInt } from 'crypto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOptionsWhere,
  In,
  IsNull,
  Not,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';

import { Reservation } from './entities/reservation.entity';
import { ReservationStatus } from './enums/reservation-status.enum';
import { UpdateReservationStatusDto } from './dto/update-reservation-status.dto';
import {
  ACTIVE_STATUSES,
  EARLY_PICKUP_HOURS,
  MAX_ACTIVE_RESERVATIONS,
  MIN_LEAD_HOURS,
  REMINDER_HOURS,
  MAX_LATE_CANCELLATIONS,
  MAX_NO_SHOWS,
  NO_SHOW_GRACE_HOURS,
  POLICY,
  RUNNING_LATE_EXTRA_HOURS,
  pickupDeadline,
  STRIKE_WINDOW_DAYS,
  cancellationWindow,
} from './reservation-policy';

import { User } from '../users/entities/user.entity';
import { Car } from '../cars/entities/car.entity';
import { Review } from '../reviews/entities/review.entity';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { NotificationType } from '../notifications/entities/notification.entity';


// Shortest reservation allowed
const MIN_RESERVATION_HOURS = 2;

const HOUR_IN_MS = 60 * 60 * 1000;

// How many handed-over bookings the handover log shows
const HANDOVER_LOG_BOOKINGS = 300;

// Discounts for long rentals, longest first
const DURATION_DISCOUNTS = [
  { minDays: 30, percent: 20 },
  { minDays: 7, percent: 10 },
];


@Injectable()
export class ReservationsService {

  private readonly logger = new Logger(ReservationsService.name);

  constructor(

    @InjectRepository(Reservation)
    private readonly reservationsRepository: Repository<Reservation>,


    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,


    @InjectRepository(Car)
    private readonly carsRepository: Repository<Car>,


    @InjectRepository(Review)
    private readonly reviewsRepository: Repository<Review>,


    private readonly emailService: EmailService,


    private readonly notificationsService: NotificationsService,


    private readonly configService: ConfigService,

  ) { }


  // USER: Create reservation
  async create(
    createReservationDto: {
      carId: number;
      startDate: string;
      endDate: string;
    },

    currentUser: {
      userId: number;
      email: string;
      role: string;
    },
  ) {

    // Too many late cancellations or no-shows (see reservation-policy.ts)
    const user = await this.usersRepository.findOne({
      where: {
        id: currentUser.userId,
      },
    });

    if (user?.bookingBlocked) {
      throw new ForbiddenException(
        'Your account cannot make new reservations. Please contact us',
      );
    }


    // So one person cannot hold many cars "just in case". Staff booking
    // for customers are not limited.
    if (currentUser.role !== 'ADMIN') {

      const activeReservations = await this.reservationsRepository.count({
        where: {
          userId: currentUser.userId,
          status: In(ACTIVE_STATUSES),
        },
      });

      if (activeReservations >= MAX_ACTIVE_RESERVATIONS) {
        throw new BadRequestException(
          `You can have at most ${MAX_ACTIVE_RESERVATIONS} active reservations`,
        );
      }

    }


    const { car, startDate, endDate } =
      await this.loadCarAndPeriod(createReservationDto);


    // Check car status before creating reservation
    if (car.status === 'MAINTENANCE') {
      throw new BadRequestException(
        'Car is currently under maintenance',
      );
    }

    if (car.status === 'INACTIVE') {
      throw new BadRequestException(
        'Car is inactive and cannot be reserved',
      );
    }


    // Check if the car is already reserved
    // during the selected dates
    if (await this.isReservedDuring(car.id, startDate, endDate)) {
      throw new ConflictException(
        'Car is already reserved for the selected dates',
      );
    }


    const reservation =
      this.reservationsRepository.create({

        userId: currentUser.userId,

        carId: car.id,

        startDate,

        endDate,

        ...this.calculatePrice(
          Number(car.pricePerDay),
          car.pricePerHour == null ? null : Number(car.pricePerHour),
          startDate,
          endDate,
        ),

      });


    const savedReservation =
      await this.reservationsRepository.save(reservation);


    // A new request waiting for the staff to confirm it
    await this.notificationsService.notifyAdmins('NEW_RESERVATION', {
      reservationId: savedReservation.id,
      car: this.carNames(car),
      startDate,
      customer: user?.fullName,
    });


    return savedReservation;

  }



  // The car's names, for notifications
  private carNames(car: Car) {

    return {
      brand: car.brand,
      brandAr: car.brandAr,
      model: car.model,
      modelAr: car.modelAr,
    };

  }



  // PUBLIC: Price a period before booking it. Runs the same checks
  // and pricing as create(), so the quote always matches the booking,
  // and says whether the car can be reserved for that period.
  async quote(
    quoteDto: {
      carId: number;
      startDate: string;
      endDate: string;
    },
  ) {

    const { car, startDate, endDate } =
      await this.loadCarAndPeriod(quoteDto);


    let unavailableReason:
      | 'maintenance'
      | 'inactive'
      | 'reserved'
      | null = null;

    if (car.status === 'MAINTENANCE') {
      unavailableReason = 'maintenance';
    } else if (car.status === 'INACTIVE') {
      unavailableReason = 'inactive';
    } else if (
      await this.isReservedDuring(car.id, startDate, endDate)
    ) {
      unavailableReason = 'reserved';
    }


    const hours = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (60 * 60 * 1000),
    );


    return {

      carId: car.id,

      startDate,

      endDate,

      hours,

      available: unavailableReason === null,

      unavailableReason,

      // Once confirmed, the booking can be cancelled for free until then
      freeCancellationUntil: cancellationWindow({
        status: ReservationStatus.CONFIRMED,
        startDate,
      })!.freeUntil,

      policy: POLICY,

      ...this.calculatePrice(
        Number(car.pricePerDay),
        car.pricePerHour == null ? null : Number(car.pricePerHour),
        startDate,
        endDate,
      ),

    };

  }



  // ADMIN: Price and availability of a rental that starts now, for a
  // customer at the office (see walkIn)
  async walkInQuote(dto: { carId: number; endDate: string }) {

    const { car, startDate, endDate } = await this.walkInPeriod(dto);


    let unavailableReason:
      | 'maintenance'
      | 'inactive'
      | 'reserved'
      | null = null;

    if (car.status === 'MAINTENANCE') {
      unavailableReason = 'maintenance';
    } else if (car.status === 'INACTIVE') {
      unavailableReason = 'inactive';
    } else if (await this.isReservedDuring(car.id, startDate, endDate)) {
      unavailableReason = 'reserved';
    }


    return {
      carId: car.id,
      startDate,
      endDate,
      hours: Math.ceil(
        (endDate.getTime() - startDate.getTime()) / HOUR_IN_MS,
      ),
      available: unavailableReason === null,
      unavailableReason,
      ...this.calculatePrice(
        Number(car.pricePerDay),
        car.pricePerHour == null ? null : Number(car.pricePerHour),
        startDate,
        endDate,
      ),
    };

  }



  // ADMIN: A customer at the office rents a car right now. The staff
  // checked their ID and license, so the booking is created already
  // handed over (PICKED_UP), with a code to return the car. The online
  // rules for customers (notice, active bookings) do not apply.
  async walkIn(
    dto: { userId: number; carId: number; endDate: string },
    staffId: number,
  ) {

    const customer = await this.usersRepository.findOne({
      where: {
        id: dto.userId,
      },
    });

    if (!customer) {
      throw new NotFoundException('User not found');
    }

    if (customer.bookingBlocked) {
      throw new ForbiddenException(
        'This customer is blocked from booking',
      );
    }


    const quote = await this.walkInQuote(dto);

    if (quote.unavailableReason === 'maintenance') {
      throw new BadRequestException('Car is currently under maintenance');
    }

    if (quote.unavailableReason === 'inactive') {
      throw new BadRequestException('Car is inactive and cannot be reserved');
    }

    if (quote.unavailableReason === 'reserved') {
      throw new ConflictException(
        'Car is already reserved for the selected dates',
      );
    }


    const reservation = this.reservationsRepository.create({
      userId: customer.id,
      carId: quote.carId,
      startDate: quote.startDate,
      endDate: quote.endDate,
      basePrice: quote.basePrice,
      discountPercent: quote.discountPercent,
      totalPrice: quote.totalPrice,
      status: ReservationStatus.PICKED_UP,
      pickedUpAt: quote.startDate,
      pickedUpById: staffId,
      // Shown to the customer to return the car
      handoverCode: await this.generateHandoverCode(),
      // Already here, no reminder needed
      reminderSentAt: quote.startDate,
    });


    const savedReservation =
      await this.reservationsRepository.save(reservation);

    await this.notifyStatusChange(savedReservation.id);

    return savedReservation;

  }



  // A walk-in rental starts now (to the minute) and ends on the hour
  // chosen by the staff
  private async walkInPeriod(dto: { carId: number; endDate: string }) {

    const car = await this.carsRepository.findOne({
      where: {
        id: dto.carId,
      },
    });

    if (!car) {
      throw new NotFoundException('Car not found');
    }


    const startDate = new Date();
    startDate.setSeconds(0, 0);

    const endDate = new Date(dto.endDate);


    if (!this.isOnTheHour(endDate)) {
      throw new BadRequestException(
        'Start and end times must be on the hour (minutes and seconds must be 0)',
      );
    }

    if (
      endDate.getTime() - startDate.getTime() <
      MIN_RESERVATION_HOURS * HOUR_IN_MS
    ) {
      throw new BadRequestException(
        `A reservation must be at least ${MIN_RESERVATION_HOURS} hours`,
      );
    }


    return { car, startDate, endDate };

  }



  // Loads the car and validates the requested period
  // (shared by create and quote)
  private async loadCarAndPeriod(
    periodDto: {
      carId: number;
      startDate: string;
      endDate: string;
    },
  ) {

    const car = await this.carsRepository.findOne({
      where: {
        id: periodDto.carId,
      },
    });


    if (!car) {
      throw new NotFoundException(
        'Car not found',
      );
    }


    const startDate = new Date(
      periodDto.startDate,
    );

    const endDate = new Date(
      periodDto.endDate,
    );


    if (startDate >= endDate) {
      throw new BadRequestException(
        'End date must be after start date',
      );
    }


    // Reservations start and end on the hour, e.g. 09:00 not 09:17
    if (!this.isOnTheHour(startDate) || !this.isOnTheHour(endDate)) {
      throw new BadRequestException(
        'Start and end times must be on the hour (minutes and seconds must be 0)',
      );
    }


    const hourInMs = 60 * 60 * 1000;

    if (
      endDate.getTime() - startDate.getTime() <
      MIN_RESERVATION_HOURS * hourInMs
    ) {
      throw new BadRequestException(
        `A reservation must be at least ${MIN_RESERVATION_HOURS} hours`,
      );
    }


    // Check if reservation dates are in the past
    const now = new Date();

    if (startDate < now || endDate < now) {
      throw new BadRequestException(
        'Reservation dates cannot be in the past',
      );
    }


    // The staff need time to confirm the reservation and prepare the car
    if (startDate.getTime() - now.getTime() < MIN_LEAD_HOURS * hourInMs) {
      throw new BadRequestException(
        `A reservation must start at least ${MIN_LEAD_HOURS} hours from now`,
      );
    }


    return { car, startDate, endDate };

  }



  // True when an active (PENDING, CONFIRMED or PICKED_UP) reservation
  // overlaps the period
  private async isReservedDuring(
    carId: number,
    startDate: Date,
    endDate: Date,
  ) {

    const existingReservation =
      await this.reservationsRepository.findOne({

        where: {
          carId,

          status: In(ACTIVE_STATUSES),

          startDate: LessThan(endDate),

          endDate: MoreThan(startDate),
        },

      });


    return Boolean(existingReservation);

  }



  // USER: Get his own reservations
  // Newest first, with each car's photos and category, and whether
  // the reservation already has a review
  async getMyReservations(
    userId: number,
  ) {

    const reservations = await this.reservationsRepository.find({

      where: {
        userId,
      },

      relations: {
        car: {
          category: true,
          images: true,
        },
      },

      order: {
        startDate: 'DESC',
        car: { images: { createdAt: 'ASC' } },
      },

    });


    const reviewed = reservations.length
      ? await this.reviewsRepository.find({
          select: { reservationId: true },
          where: {
            reservationId: In(reservations.map((reservation) => reservation.id)),
          },
        })
      : [];

    const reviewedIds = new Set(
      reviewed.map((review) => review.reservationId),
    );


    const now = new Date();

    return reservations.map((reservation) => ({
      ...reservation,
      // Shown at pickup and again at return, then no longer needed. A
      // customer who arrives after a no-show can still show it until the
      // reservation ends.
      handoverCode:
        reservation.status === ReservationStatus.CONFIRMED ||
        reservation.status === ReservationStatus.PICKED_UP ||
        (reservation.status === ReservationStatus.NO_SHOW &&
          reservation.endDate > now)
          ? reservation.handoverCode
          : null,
      reviewed: reviewedIds.has(reservation.id),
      // Until when it can be cancelled (and for free), or null
      cancellation: cancellationWindow(reservation),
      // Until when the car is kept for the customer
      pickupDeadline:
        reservation.status === ReservationStatus.CONFIRMED
          ? pickupDeadline(reservation)
          : null,
    }));

  }



  // USER / ADMIN: Get one reservation
  async getOne(
    id: number,
    userId: number,
    role: string,
  ) {

    const reservation =
      await this.reservationsRepository.findOne({

        where: {
          id,
        },

        relations: {
          user: true,
          car: true,
        },

        select: {
          id: true,
          startDate: true,
          endDate: true,
          status: true,
          basePrice: true,
        discountPercent: true,
        totalPrice: true,
          lateCancellation: true,
          cancelledAt: true,
          pickedUpAt: true,
          runningLate: true,
          returnedAt: true,
          userId: true,
          carId: true,
          createdAt: true,
          updatedAt: true,

          user: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },

          car: {
            id: true,
            brand: true,
            model: true,
            licensePlate: true,
            year: true,
            pricePerDay: true,
            color: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },

      });


    if (!reservation) {
      throw new NotFoundException(
        'Reservation not found',
      );
    }


    // USER can view only his own reservation
    if (
      role !== 'ADMIN' &&
      reservation.userId !== userId
    ) {
      throw new ForbiddenException(
        'You can only view your own reservation',
      );
    }


    return reservation;

  }



  // ADMIN: Get all reservations, each with the customer's record
  // (completed rentals, late cancellations and no-shows), so the admin
  // can decide whether to confirm
  async findAll() {

    const reservations = await this.reservationsRepository.find({

      relations: {
        user: true,
        car: true,
      },

      select: {
        id: true,
        startDate: true,
        endDate: true,
        status: true,
        basePrice: true,
        discountPercent: true,
        totalPrice: true,
        lateCancellation: true,
        cancelledAt: true,
        pickedUpAt: true,
        runningLate: true,
        returnedAt: true,
        userId: true,
        carId: true,
        createdAt: true,
        updatedAt: true,

        user: {
          id: true,
          fullName: true,
          email: true,
          phoneNumber: true,
          role: true,
          bookingBlocked: true,
        },

        car: {
          id: true,
          brand: true,
          brandAr: true,
          model: true,
          modelAr: true,
          licensePlate: true,
          year: true,
          pricePerDay: true,
          color: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      },

      // Newest first, so new requests are at the top
      order: {
        createdAt: 'DESC',
      },

    });


    const records = await this.getUserRecords(
      [...new Set(reservations.map((reservation) => reservation.userId))],
    );


    return reservations.map((reservation) => ({
      ...reservation,
      user: {
        ...reservation.user,
        record: records.get(reservation.userId) ?? {
          completed: 0,
          lateCancellations: 0,
          noShows: 0,
        },
      },
    }));

  }



  // How reliable each user has been, counted over all their reservations
  private async getUserRecords(userIds: number[]) {

    const records = new Map<
      number,
      { completed: number; lateCancellations: number; noShows: number }
    >();

    if (userIds.length === 0) {
      return records;
    }


    const rows: {
      userId: number;
      completed: string;
      lateCancellations: string;
      noShows: string;
    }[] = await this.reservationsRepository
      .createQueryBuilder('reservation')
      .select('reservation.userId', 'userId')
      .addSelect(
        `COUNT(*) FILTER (WHERE "reservation"."status" = '${ReservationStatus.COMPLETED}')`,
        'completed',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE "reservation"."lateCancellation")`,
        'lateCancellations',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE "reservation"."status" = '${ReservationStatus.NO_SHOW}')`,
        'noShows',
      )
      .where('reservation.userId IN (:...userIds)', { userIds })
      .groupBy('reservation.userId')
      .getRawMany();


    // PostgreSQL returns counts as strings
    for (const row of rows) {
      records.set(Number(row.userId), {
        completed: Number(row.completed),
        lateCancellations: Number(row.lateCancellations),
        noShows: Number(row.noShows),
      });
    }

    return records;

  }



  // ADMIN: Get reservations for a specific user
  async getUserReservations(
    userId: number,
  ) {

    const user =
      await this.usersRepository.findOne({

        where: {
          id: userId,
        },

      });


    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }


    return this.reservationsRepository.find({

      where: {
        userId,
      },

      relations: {
        user: true,
        car: true,
      },

      select: {
        id: true,
        startDate: true,
        endDate: true,
        status: true,
        basePrice: true,
        discountPercent: true,
        totalPrice: true,
        lateCancellation: true,
        cancelledAt: true,
        pickedUpAt: true,
        runningLate: true,
        returnedAt: true,
        userId: true,
        carId: true,
        createdAt: true,
        updatedAt: true,

        user: {
          id: true,
          fullName: true,
          email: true,
          role: true,
        },

        car: {
          id: true,
          brand: true,
          model: true,
          licensePlate: true,
          year: true,
          pricePerDay: true,
          color: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      },

    });

  }



  // ADMIN: Confirm a pending reservation
  async confirm(id: number) {

    const reservation =
      await this.reservationsRepository.findOne({

        where: {
          id,
        },

      });


    if (!reservation) {
      throw new NotFoundException(
        'Reservation not found',
      );
    }


    if (
      reservation.status !==
      ReservationStatus.PENDING
    ) {
      throw new BadRequestException(
        'Only PENDING reservations can be confirmed',
      );
    }


    reservation.status =
      ReservationStatus.CONFIRMED;

    reservation.handoverCode = await this.generateHandoverCode();

    // The confirmation email already has everything a reminder would
    if (
      reservation.startDate.getTime() - Date.now() <=
      REMINDER_HOURS * HOUR_IN_MS
    ) {
      reservation.reminderSentAt = new Date();
    }


    const savedReservation =
      await this.reservationsRepository.save(reservation);

    await this.notifyStatusChange(savedReservation.id);

    return savedReservation;

  }



  // ADMIN: Hand the car over to the customer. Allowed from shortly
  // before pickup until the end of the reservation. A customer who
  // arrives after the reservation became NO_SHOW can still get the car
  // if nobody else booked it since; the no-show then no longer counts.
  async pickUp(id: number, staffId: number | null = null) {

    const reservation = await this.findReservation(id);

    const lateArrival = reservation.status === ReservationStatus.NO_SHOW;


    if (reservation.status !== ReservationStatus.CONFIRMED && !lateArrival) {
      throw new BadRequestException(
        'Only CONFIRMED reservations can be picked up',
      );
    }


    const now = new Date();

    const earliest = new Date(
      reservation.startDate.getTime() - EARLY_PICKUP_HOURS * HOUR_IN_MS,
    );

    if (now < earliest) {
      throw new BadRequestException(
        'It is too early to hand over this car',
      );
    }

    if (now >= reservation.endDate) {
      throw new BadRequestException(
        'This reservation has already ended',
      );
    }


    // The no-show freed the car, so someone may have booked it since
    if (
      lateArrival &&
      (await this.isReservedDuring(reservation.carId, now, reservation.endDate))
    ) {
      throw new ConflictException(
        'The car was booked by someone else after the no-show',
      );
    }


    reservation.status = ReservationStatus.PICKED_UP;
    reservation.pickedUpAt = now;
    reservation.pickedUpById = staffId;


    const savedReservation =
      await this.reservationsRepository.save(reservation);

    await this.notifyStatusChange(savedReservation.id);

    return savedReservation;

  }



  // USER: Say they are running late (once per reservation), so the car
  // is kept RUNNING_LATE_EXTRA_HOURS longer before it becomes NO_SHOW
  async markRunningLate(id: number, userId: number) {

    const reservation = await this.findReservation(id);


    if (reservation.userId !== userId) {
      throw new ForbiddenException(
        'You can only change your own reservation',
      );
    }

    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new BadRequestException(
        'Only CONFIRMED reservations can be marked as running late',
      );
    }

    if (reservation.runningLate) {
      throw new BadRequestException(
        'You already said you are running late',
      );
    }

    if (new Date() >= pickupDeadline(reservation)) {
      throw new BadRequestException(
        'The pickup time has already passed',
      );
    }


    reservation.runningLate = true;

    const savedReservation =
      await this.reservationsRepository.save(reservation);


    // Let the staff know the customer is on the way
    const withDetails = await this.reservationsRepository.findOne({
      where: { id },
      relations: { user: true, car: true },
    });

    if (withDetails?.car && withDetails.user) {
      await this.notificationsService.notifyAdmins('CUSTOMER_RUNNING_LATE', {
        reservationId: id,
        car: this.carNames(withDetails.car),
        startDate: withDetails.startDate,
        customer: withDetails.user.fullName,
      });
    }


    return {
      ...savedReservation,
      pickupDeadline: pickupDeadline(savedReservation),
    };

  }



  // ADMIN: Find the reservation of a handover code (scanned from the
  // customer's QR code or typed), to check the customer and the car
  // before handing it over, or when it comes back (mode "return"). A
  // customer who arrives after their reservation became NO_SHOW is found
  // too, until it ends, so the staff can still hand the car over if it
  // is free.
  async findByHandoverCode(code: string) {

    const load = (where: FindOptionsWhere<Reservation>) =>
      this.reservationsRepository.findOne({

        where: {
          ...where,
          handoverCode: code,
        },

        relations: {
          user: true,
          car: {
            images: true,
          },
        },

        select: {
          id: true,
          startDate: true,
          endDate: true,
          status: true,
          totalPrice: true,
          runningLate: true,
          pickedUpAt: true,
          userId: true,
          carId: true,

          user: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
          },

          car: {
            id: true,
            brand: true,
            brandAr: true,
            model: true,
            modelAr: true,
            color: true,
            colorAr: true,
            licensePlate: true,
            images: {
              id: true,
              url: true,
              createdAt: true,
            },
          },
        },

        order: {
          startDate: 'DESC',
          car: { images: { createdAt: 'ASC' } },
        },

      });


    const now = new Date();

    const reservation =
      (await load({ status: ReservationStatus.CONFIRMED })) ??
      (await load({
        status: ReservationStatus.NO_SHOW,
        endDate: MoreThan(now),
      })) ??
      (await load({ status: ReservationStatus.PICKED_UP }));


    if (!reservation) {

      // Scanned again after the return: say so instead of "invalid"
      const returned = await this.reservationsRepository.findOne({
        where: {
          handoverCode: code,
          status: ReservationStatus.COMPLETED,
        },
      });

      if (returned) {
        throw new BadRequestException(
          'This car was already returned',
        );
      }

      throw new NotFoundException(
        'Invalid handover code',
      );

    }


    const lateArrival = reservation.status === ReservationStatus.NO_SHOW;


    return {
      ...reservation,
      // Hand the car over, or take it back
      mode:
        reservation.status === ReservationStatus.PICKED_UP
          ? ('return' as const)
          : ('pickup' as const),
      // From when the car can be handed over (see pickUp)
      handoverFrom: new Date(
        reservation.startDate.getTime() - EARLY_PICKUP_HOURS * HOUR_IN_MS,
      ),
      // Until when the car is kept for the customer (before NO_SHOW)
      pickupDeadline: pickupDeadline(reservation),
      // After a no-show, someone else may have booked the car since
      carTaken:
        lateArrival &&
        (await this.isReservedDuring(reservation.carId, now, reservation.endDate)),
    };

  }



  // ADMIN: Hand the car over to the customer who showed this code
  async handOver(code: string, staffId: number) {

    const reservation = await this.findByHandoverCode(code);

    if (reservation.mode !== 'pickup') {
      throw new BadRequestException(
        'This car was already handed over',
      );
    }

    return this.pickUp(reservation.id, staffId);

  }



  // ADMIN: Take the car back from the customer who showed this code
  async returnCar(code: string, staffId: number) {

    const reservation = await this.findByHandoverCode(code);

    if (reservation.mode !== 'return') {
      throw new BadRequestException(
        'This car has not been handed over yet',
      );
    }

    return this.complete(reservation.id, staffId);

  }



  // ADMIN: The log of handovers and returns, newest first, so the staff
  // can look back at them and print their receipts again. Each booking
  // gives a "pickup" event, and a "return" event once the car is back.
  async getHandoverLog(limit = HANDOVER_LOG_BOOKINGS) {

    const reservations =
      await this.reservationsRepository.find({

        where: {
          pickedUpAt: Not(IsNull()),
        },

        relations: {
          user: true,
          car: true,
          pickedUpBy: true,
          returnedBy: true,
        },

        select: {
          id: true,
          startDate: true,
          endDate: true,
          status: true,
          totalPrice: true,
          pickedUpAt: true,
          returnedAt: true,

          user: {
            id: true,
            fullName: true,
            phoneNumber: true,
          },

          car: {
            id: true,
            brand: true,
            brandAr: true,
            model: true,
            modelAr: true,
            licensePlate: true,
          },

          pickedUpBy: {
            id: true,
            fullName: true,
          },

          returnedBy: {
            id: true,
            fullName: true,
          },
        },

        // Returns happen after pickups, so the newest events are among
        // the latest pickups
        order: {
          pickedUpAt: 'DESC',
        },

        take: limit,

      });


    const events = reservations.flatMap((reservation) => {

      const booking = {
        reservationId: reservation.id,
        startDate: reservation.startDate,
        endDate: reservation.endDate,
        totalPrice: reservation.totalPrice,
        user: reservation.user,
        car: reservation.car,
      };

      const pickup = {
        ...booking,
        type: 'pickup' as const,
        at: reservation.pickedUpAt!,
        staff: reservation.pickedUpBy?.fullName ?? null,
        // Full hours after the booked pickup time
        lateHours: Math.floor(
          this.hoursAfter(reservation.startDate, reservation.pickedUpAt!),
        ),
      };

      if (!reservation.returnedAt) {
        return [pickup];
      }

      return [
        pickup,
        {
          ...booking,
          type: 'return' as const,
          at: reservation.returnedAt,
          staff: reservation.returnedBy?.fullName ?? null,
          // Hours after the booked return time, a started hour counts
          lateHours: Math.ceil(
            this.hoursAfter(reservation.endDate, reservation.returnedAt),
          ),
        },
      ];

    });


    return events.sort((a, b) => b.at.getTime() - a.at.getTime());

  }



  // Hours from `due` to `at`; 0 when on time
  private hoursAfter(due: Date, at: Date) {

    return Math.max(0, (at.getTime() - due.getTime()) / HOUR_IN_MS);

  }



  // ADMIN: Everything printed on the handover and return receipts
  async getReceipt(id: number) {

    const reservation =
      await this.reservationsRepository.findOne({

        where: {
          id,
        },

        relations: {
          user: true,
          car: {
            category: true,
          },
          pickedUpBy: true,
          returnedBy: true,
        },

        select: {
          id: true,
          startDate: true,
          endDate: true,
          status: true,
          basePrice: true,
          discountPercent: true,
          totalPrice: true,
          pickedUpAt: true,
          returnedAt: true,
          createdAt: true,

          user: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
          },

          car: {
            id: true,
            brand: true,
            brandAr: true,
            model: true,
            modelAr: true,
            year: true,
            color: true,
            colorAr: true,
            licensePlate: true,
            category: {
              id: true,
              name: true,
              nameAr: true,
            },
          },

          pickedUpBy: {
            id: true,
            fullName: true,
          },

          returnedBy: {
            id: true,
            fullName: true,
          },
        },

      });


    if (!reservation) {
      throw new NotFoundException(
        'Reservation not found',
      );
    }

    if (!reservation.pickedUpAt) {
      throw new BadRequestException(
        'The car has not been handed over yet',
      );
    }

    return reservation;

  }



  // A random 6-digit code no other reservation that can still be handed
  // over is using
  private async generateHandoverCode() {

    for (let attempt = 0; attempt < 20; attempt++) {

      const code = randomInt(0, 1_000_000).toString().padStart(6, '0');

      // The code is used again at return, and a no-show can still be
      // handed over until it ends, so the code stays taken until then
      const taken = await this.reservationsRepository.findOne({
        where: [
          {
            handoverCode: code,
            status: In([
              ReservationStatus.CONFIRMED,
              ReservationStatus.PICKED_UP,
            ]),
          },
          {
            handoverCode: code,
            status: ReservationStatus.NO_SHOW,
            endDate: MoreThan(new Date()),
          },
        ],
      });

      if (!taken) {
        return code;
      }

    }

    throw new ConflictException(
      'Could not create a handover code, please try again',
    );

  }



  // ADMIN: The customer returned the car. It can come back early.
  async complete(id: number, staffId: number | null = null) {

    const reservation = await this.findReservation(id);


    if (reservation.status !== ReservationStatus.PICKED_UP) {
      throw new BadRequestException(
        'Only PICKED_UP reservations can be completed',
      );
    }


    reservation.status = ReservationStatus.COMPLETED;
    reservation.returnedAt = new Date();
    reservation.returnedById = staffId;


    const savedReservation =
      await this.reservationsRepository.save(reservation);

    await this.notifyStatusChange(savedReservation.id);

    return savedReservation;

  }



  // USER / ADMIN: Cancel reservation
  async cancel(
    id: number,
    userId: number,
    role: string,
  ) {

    const reservation = await this.findReservation(id);


    // USER can cancel only his own reservation
    if (
      role !== 'ADMIN' &&
      reservation.userId !== userId
    ) {
      throw new ForbiddenException(
        'You can only cancel your own reservation',
      );
    }


    // An admin cancelling someone else's booking, or the customer
    const cancelledBy =
      role === 'ADMIN' && reservation.userId !== userId ? 'admin' : 'user';

    return this.cancelReservation(reservation, cancelledBy);

  }



  // The customer follows the cancellation policy (reservation-policy.ts):
  // free until FREE_CANCELLATION_HOURS before pickup, then counted as a
  // late cancellation, and not possible online in the last
  // CANCELLATION_CUTOFF_HOURS. An admin can cancel until pickup.
  private async cancelReservation(
    reservation: Reservation,
    cancelledBy: 'user' | 'admin',
  ) {

    // Only PENDING or CONFIRMED reservations can be cancelled
    if (
      reservation.status !== ReservationStatus.PENDING &&
      reservation.status !== ReservationStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        'Only PENDING or CONFIRMED reservations can be cancelled',
      );
    }


    // Reservation cannot be cancelled after it has started
    const now = new Date();

    if (reservation.startDate <= now) {
      throw new BadRequestException(
        'Reservation cannot be cancelled after the start date',
      );
    }


    if (cancelledBy === 'user') {

      const window = cancellationWindow(reservation)!;

      if (now > window.until) {
        throw new BadRequestException(
          'It is too late to cancel this reservation online. Please contact us',
        );
      }

      reservation.lateCancellation = now > window.freeUntil;

    }


    reservation.status = ReservationStatus.CANCELLED;
    reservation.cancelledAt = now;


    const savedReservation =
      await this.reservationsRepository.save(reservation);

    await this.notifyStatusChange(savedReservation.id, cancelledBy);

    if (savedReservation.lateCancellation) {
      await this.applyStrikes(savedReservation.userId);
    }

    return savedReservation;

  }



  // ADMIN: Update reservation status, with the same rules as the
  // dedicated routes
  async updateStatus(
    id: number,
    updateStatusDto: UpdateReservationStatusDto,
    staffId: number | null = null,
  ) {

    switch (updateStatusDto.status) {

      case ReservationStatus.CONFIRMED:
        return this.confirm(id);

      case ReservationStatus.PICKED_UP:
        return this.pickUp(id, staffId);

      case ReservationStatus.COMPLETED:
        return this.complete(id, staffId);

      case ReservationStatus.CANCELLED:
        return this.cancelReservation(
          await this.findReservation(id),
          'admin',
        );

      default:
        throw new BadRequestException(
          `Cannot change reservation status to ${updateStatusDto.status}`,
        );

    }

  }



  private async findReservation(id: number) {

    const reservation =
      await this.reservationsRepository.findOne({

        where: {
          id,
        },

      });


    if (!reservation) {
      throw new NotFoundException(
        'Reservation not found',
      );
    }

    return reservation;

  }



  // Base price, then the discount for long rentals: 10% from 7 days and
  // 20% from 30 days (the longest matching discount applies)
  private calculatePrice(
    pricePerDay: number,
    pricePerHour: number | null,
    startDate: Date,
    endDate: Date,
  ) {

    const baseCents = this.calculateBaseCents(
      pricePerDay,
      pricePerHour,
      startDate,
      endDate,
    );

    const days =
      (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000);

    const discountPercent =
      DURATION_DISCOUNTS.find((discount) => days >= discount.minDays)
        ?.percent ?? 0;

    const totalCents = Math.round(
      (baseCents * (100 - discountPercent)) / 100,
    );

    return {
      basePrice: baseCents / 100,
      discountPercent,
      totalPrice: totalCents / 100,
    };

  }



  // Full days are charged at pricePerDay. Hours left over are charged at
  // pricePerHour, but never more than one more day, so the customer always
  // pays the cheaper of the two. A car without pricePerHour is rented by
  // the day: a partial day counts as a full day.
  // Works in cents to avoid floating point errors.
  private calculateBaseCents(
    pricePerDay: number,
    pricePerHour: number | null,
    startDate: Date,
    endDate: Date,
  ) {

    const hours = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (60 * 60 * 1000),
    );

    const dayCents = Math.round(pricePerDay * 100);

    const fullDays = Math.floor(hours / 24);
    const extraHours = hours % 24;

    let extraCents = 0;

    if (extraHours > 0) {
      extraCents =
        pricePerHour === null
          ? dayCents
          : Math.min(extraHours * Math.round(pricePerHour * 100), dayCents);
    }

    return fullDays * dayCents + extraCents;

  }



  private isOnTheHour(date: Date) {

    return (
      date.getUTCMinutes() === 0 &&
      date.getUTCSeconds() === 0 &&
      date.getUTCMilliseconds() === 0
    );

  }



  // Every hour, cancel PENDING reservations the admin did not confirm in
  // time, so they stop blocking the car. A reservation expires when
  // whichever comes first: PENDING_RESERVATION_TTL_HOURS (default 24)
  // have passed since it was created, or its start date has arrived.
  @Cron(CronExpression.EVERY_HOUR)
  async expirePendingReservations() {

    const ttlHours = Number(
      this.configService.get<string>('PENDING_RESERVATION_TTL_HOURS') || 24,
    );

    const now = new Date();

    const createdBefore = new Date(
      now.getTime() - ttlHours * 60 * 60 * 1000,
    );


    const expiredReservations =
      await this.reservationsRepository.find({

        // Each object is an OR condition
        where: [
          {
            status: ReservationStatus.PENDING,
            createdAt: LessThanOrEqual(createdBefore),
          },
          {
            status: ReservationStatus.PENDING,
            startDate: LessThanOrEqual(now),
          },
        ],

      });


    for (const reservation of expiredReservations) {

      reservation.status = ReservationStatus.CANCELLED;

      await this.reservationsRepository.save(reservation);

      await this.notifyStatusChange(reservation.id, 'system');

    }


    if (expiredReservations.length > 0) {
      this.logger.log(
        `Cancelled ${expiredReservations.length} unconfirmed reservation(s)`,
      );
    }


    return expiredReservations.length;

  }



  // Every 10 minutes, remind customers REMINDER_HOURS before pickup, by
  // email with the pickup code. Each reservation is reminded once.
  @Cron(CronExpression.EVERY_10_MINUTES)
  async sendPickupReminders() {

    const now = new Date();

    const upcoming =
      await this.reservationsRepository.find({

        where: {
          status: ReservationStatus.CONFIRMED,
          reminderSentAt: IsNull(),
          startDate: Between(
            now,
            new Date(now.getTime() + REMINDER_HOURS * HOUR_IN_MS),
          ),
        },

      });


    for (const reservation of upcoming) {

      reservation.reminderSentAt = now;

      await this.reservationsRepository.save(reservation);

      await this.notifyStatusChange(reservation.id, undefined, 'REMINDER');

    }


    if (upcoming.length > 0) {
      this.logger.log(
        `Sent ${upcoming.length} pickup reminder(s)`,
      );
    }


    return upcoming.length;

  }



  // Every 10 minutes, mark CONFIRMED reservations whose car was not
  // picked up NO_SHOW_GRACE_HOURS after pickup time. The car becomes free
  // again and the no-show counts against the customer.
  @Cron(CronExpression.EVERY_10_MINUTES)
  async markNoShows() {

    const startedBefore = (hours: number) =>
      new Date(Date.now() - hours * HOUR_IN_MS);


    const missedReservations =
      await this.reservationsRepository.find({

        // Each object is an OR condition: customers who said they are
        // running late get more time
        where: [
          {
            status: ReservationStatus.CONFIRMED,
            runningLate: false,
            startDate: LessThanOrEqual(startedBefore(NO_SHOW_GRACE_HOURS)),
          },
          {
            status: ReservationStatus.CONFIRMED,
            runningLate: true,
            startDate: LessThanOrEqual(
              startedBefore(NO_SHOW_GRACE_HOURS + RUNNING_LATE_EXTRA_HOURS),
            ),
          },
        ],

      });


    for (const reservation of missedReservations) {

      reservation.status = ReservationStatus.NO_SHOW;

      await this.reservationsRepository.save(reservation);

      await this.notifyStatusChange(reservation.id);

      await this.applyStrikes(reservation.userId);

    }


    if (missedReservations.length > 0) {
      this.logger.log(
        `Marked ${missedReservations.length} reservation(s) as no-show`,
      );
    }


    return missedReservations.length;

  }



  // Stop a user from booking after MAX_LATE_CANCELLATIONS late
  // cancellations or MAX_NO_SHOWS no-shows in the last STRIKE_WINDOW_DAYS.
  // Only strikes after an admin last allowed the user again count.
  private async applyStrikes(userId: number) {

    const user = await this.usersRepository.findOne({
      where: {
        id: userId,
      },
    });

    if (!user || user.bookingBlocked) {
      return;
    }


    const windowStart = new Date(
      Date.now() - STRIKE_WINDOW_DAYS * 24 * HOUR_IN_MS,
    );

    const since =
      user.strikesResetAt && user.strikesResetAt > windowStart
        ? user.strikesResetAt
        : windowStart;


    const [lateCancellations, noShows] = await Promise.all([

      this.reservationsRepository.count({
        where: {
          userId,
          lateCancellation: true,
          cancelledAt: MoreThanOrEqual(since),
        },
      }),

      this.reservationsRepository.count({
        where: {
          userId,
          status: ReservationStatus.NO_SHOW,
          startDate: MoreThanOrEqual(since),
        },
      }),

    ]);


    if (
      lateCancellations >= MAX_LATE_CANCELLATIONS ||
      noShows >= MAX_NO_SHOWS
    ) {

      await this.usersRepository.update(userId, { bookingBlocked: true });

      await this.notificationsService.notify(userId, 'BOOKING_BLOCKED');

      this.logger.log(
        `Blocked user ${userId} from booking (${lateCancellations} late cancellation(s), ${noShows} no-show(s))`,
      );

    }

  }



  // The same news in the website's notifications: for the customer, and
  // for the staff when the customer cancelled or did not come
  private async notifyInApp(
    reservation: Reservation,
    cancelledBy?: 'user' | 'admin' | 'system',
    kind?: 'REMINDER',
  ) {

    const data = {
      reservationId: reservation.id,
      car: this.carNames(reservation.car),
      startDate: reservation.startDate,
    };

    const forCustomer: Partial<Record<string, NotificationType>> = {
      REMINDER: 'PICKUP_REMINDER',
      [ReservationStatus.CONFIRMED]: 'RESERVATION_CONFIRMED',
      [ReservationStatus.CANCELLED]: 'RESERVATION_CANCELLED',
      [ReservationStatus.PICKED_UP]: 'RESERVATION_PICKED_UP',
      [ReservationStatus.COMPLETED]: 'RESERVATION_COMPLETED',
      [ReservationStatus.NO_SHOW]: 'RESERVATION_NO_SHOW',
    };

    const type = forCustomer[kind ?? reservation.status];

    if (type) {
      await this.notificationsService.notify(reservation.userId, type, {
        ...data,
        cancelledBy,
        lateCancellation: reservation.lateCancellation,
      });
    }


    if (kind) {
      return;
    }

    const customer = reservation.user.fullName;

    if (
      reservation.status === ReservationStatus.CANCELLED &&
      cancelledBy === 'user'
    ) {
      await this.notificationsService.notifyAdmins('CUSTOMER_CANCELLED', {
        ...data,
        customer,
        lateCancellation: reservation.lateCancellation,
      });
    }

    if (reservation.status === ReservationStatus.NO_SHOW) {
      await this.notificationsService.notifyAdmins('CUSTOMER_NO_SHOW', {
        ...data,
        customer,
      });
    }

  }



  // Email the user when their reservation is confirmed, picked up,
  // cancelled, completed or missed, or to remind them before pickup
  // (kind "REMINDER"). A failed email must not undo the status change, so
  // errors are only logged.
  // cancelledBy: who cancelled, so the email can say it (see EmailService)
  private async notifyStatusChange(
    reservationId: number,
    cancelledBy?: 'user' | 'admin' | 'system',
    kind?: 'REMINDER',
  ) {

    try {

      const reservation =
        await this.reservationsRepository.findOne({

          where: {
            id: reservationId,
          },

          relations: {
            user: true,
            car: true,
          },

        });


      if (
        !reservation ||
        reservation.status === ReservationStatus.PENDING
      ) {
        return;
      }


      await this.notifyInApp(reservation, cancelledBy, kind);


      // The email is in Arabic, so the Arabic names are used when set
      const car = reservation.car;

      await this.emailService.sendReservationStatus(
        reservation.user.email,
        {
          fullName: reservation.user.fullName,
          reservationId: reservation.id,
          status: kind ?? reservation.status,
          car: `${car.brandAr || car.brand} ${car.modelAr || car.model}`,
          licensePlate: car.licensePlate,
          startDate: reservation.startDate,
          endDate: reservation.endDate,
          basePrice: Number(reservation.basePrice),
          discountPercent: reservation.discountPercent,
          totalPrice: Number(reservation.totalPrice),
          cancelledBy,
          lateCancellation: reservation.lateCancellation,
          handoverCode: reservation.handoverCode ?? undefined,
        },
      );

    } catch (error) {

      this.logger.warn(
        `Could not send status email for reservation ${reservationId}: ${(error as Error).message}`,
      );

    }

  }

}
