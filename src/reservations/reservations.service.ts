import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import {
  In,
  LessThan,
  MoreThan,
  Repository,
} from 'typeorm';

import { Reservation } from './entities/reservation.entity';
import { ReservationStatus } from './enums/reservation-status.enum';
import { UpdateReservationStatusDto } from './dto/update-reservation-status.dto';

import { User } from '../users/entities/user.entity';
import { Car } from '../cars/entities/car.entity';


// Shortest reservation allowed
const MIN_RESERVATION_HOURS = 2;

// Discounts for long rentals, longest first
const DURATION_DISCOUNTS = [
  { minDays: 30, percent: 20 },
  { minDays: 7, percent: 10 },
];


@Injectable()
export class ReservationsService {

  constructor(

    @InjectRepository(Reservation)
    private readonly reservationsRepository: Repository<Reservation>,


    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,


    @InjectRepository(Car)
    private readonly carsRepository: Repository<Car>,

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

    const car = await this.carsRepository.findOne({
      where: {
        id: createReservationDto.carId,
      },
    });


    if (!car) {
      throw new NotFoundException(
        'Car not found',
      );
    }


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


    const startDate = new Date(
      createReservationDto.startDate,
    );

    const endDate = new Date(
      createReservationDto.endDate,
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


    // Check if the car is already reserved
    // during the selected dates
    const existingReservation =
      await this.reservationsRepository.findOne({

        where: {
          carId: car.id,

          status: In([
            ReservationStatus.PENDING,
            ReservationStatus.CONFIRMED,
          ]),

          startDate: LessThan(endDate),

          endDate: MoreThan(startDate),
        },

      });


    if (existingReservation) {
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


    return this.reservationsRepository.save(
      reservation,
    );

  }



  // USER: Get his own reservations
  async getMyReservations(
    userId: number,
  ) {

    return this.reservationsRepository.find({

      where: {
        userId,
      },

      relations: {
        car: true,
      },

    });

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



  // ADMIN: Get all reservations
  async findAll() {

    return this.reservationsRepository.find({

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


    return this.reservationsRepository.save(
      reservation,
    );

  }



  // ADMIN: Complete a confirmed reservation
  async complete(id: number) {

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


    // Only CONFIRMED reservations can be completed
    if (
      reservation.status !==
      ReservationStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        'Only CONFIRMED reservations can be completed',
      );
    }


    // Reservation cannot be completed
    // before its end date
    const now = new Date();

    if (reservation.endDate > now) {
      throw new BadRequestException(
        'Reservation cannot be completed before the end date',
      );
    }


    reservation.status =
      ReservationStatus.COMPLETED;


    return this.reservationsRepository.save(
      reservation,
    );

  }



  // USER / ADMIN: Cancel reservation
  async cancel(
    id: number,
    userId: number,
    role: string,
  ) {

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


    // USER can cancel only his own reservation
    if (
      role !== 'ADMIN' &&
      reservation.userId !== userId
    ) {
      throw new ForbiddenException(
        'You can only cancel your own reservation',
      );
    }


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


    reservation.status =
      ReservationStatus.CANCELLED;


    return this.reservationsRepository.save(
      reservation,
    );

  }



  // ADMIN: Update reservation status
  async updateStatus(
    id: number,
    updateStatusDto: UpdateReservationStatusDto,
  ) {

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


    const currentStatus = reservation.status;
    const newStatus = updateStatusDto.status;


    // PENDING -> CONFIRMED
    if (
      currentStatus === ReservationStatus.PENDING &&
      newStatus === ReservationStatus.CONFIRMED
    ) {

      reservation.status =
        ReservationStatus.CONFIRMED;

    }


    // PENDING -> CANCELLED
    else if (
      currentStatus === ReservationStatus.PENDING &&
      newStatus === ReservationStatus.CANCELLED
    ) {

      reservation.status =
        ReservationStatus.CANCELLED;

    }


    // CONFIRMED -> COMPLETED
    else if (
      currentStatus === ReservationStatus.CONFIRMED &&
      newStatus === ReservationStatus.COMPLETED
    ) {

      const now = new Date();

      if (reservation.endDate > now) {
        throw new BadRequestException(
          'Reservation cannot be completed before the end date',
        );
      }

      reservation.status =
        ReservationStatus.COMPLETED;

    }


    // CONFIRMED -> CANCELLED
    else if (
      currentStatus === ReservationStatus.CONFIRMED &&
      newStatus === ReservationStatus.CANCELLED
    ) {

      const now = new Date();

      if (reservation.startDate <= now) {
        throw new BadRequestException(
          'Reservation cannot be cancelled after the start date',
        );
      }

      reservation.status =
        ReservationStatus.CANCELLED;

    }


    // All other transitions are not allowed
    else {

      throw new BadRequestException(
        `Cannot change reservation status from ${currentStatus} to ${newStatus}`,
      );

    }


    return this.reservationsRepository.save(
      reservation,
    );

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

}
