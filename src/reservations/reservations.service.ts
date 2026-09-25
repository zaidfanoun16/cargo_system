import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
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
import { EmailService } from '../email/email.service';


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


    private readonly emailService: EmailService,

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

        totalPrice: this.calculateTotalPrice(
          Number(car.pricePerDay),
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


    const savedReservation =
      await this.reservationsRepository.save(reservation);

    await this.notifyStatusChange(savedReservation.id);

    return savedReservation;

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


    const savedReservation =
      await this.reservationsRepository.save(reservation);

    await this.notifyStatusChange(savedReservation.id);

    return savedReservation;

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


    const savedReservation =
      await this.reservationsRepository.save(reservation);

    await this.notifyStatusChange(savedReservation.id);

    return savedReservation;

  }



  // Days are counted in whole 24-hour periods, rounding up a partial day.
  // Prices are multiplied in cents to avoid floating point errors.
  private calculateTotalPrice(
    pricePerDay: number,
    startDate: Date,
    endDate: Date,
  ) {

    const dayInMs = 24 * 60 * 60 * 1000;

    const days = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / dayInMs,
    );

    return (Math.round(pricePerDay * 100) * days) / 100;

  }



  // Email the user when their reservation is confirmed, cancelled or
  // completed. A failed email must not undo the status change, so errors
  // are only logged.
  private async notifyStatusChange(reservationId: number) {

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


      await this.emailService.sendReservationStatus(
        reservation.user.email,
        {
          fullName: reservation.user.fullName,
          reservationId: reservation.id,
          status: reservation.status,
          car: `${reservation.car.brand} ${reservation.car.model}`,
          startDate: reservation.startDate,
          endDate: reservation.endDate,
          totalPrice: reservation.totalPrice,
        },
      );

    } catch (error) {

      this.logger.warn(
        `Could not send status email for reservation ${reservationId}: ${(error as Error).message}`,
      );

    }

  }

}
