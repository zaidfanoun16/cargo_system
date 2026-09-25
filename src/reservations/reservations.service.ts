import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, MoreThan, Repository } from 'typeorm';

import { Reservation } from './entities/reservation.entity';
import { User } from '../users/entities/user.entity';
import { Car } from '../cars/entities/car.entity';
import { ReservationStatus } from './enums/reservation-status.enum';


@Injectable()
export class ReservationsService {

  constructor(

    @InjectRepository(Reservation)
    private readonly reservationsRepository: Repository<Reservation>,


    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,


    @InjectRepository(Car)
    private readonly carsRepository: Repository<Car>,

  ) {}


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


    // The car must not have an active reservation that overlaps these dates
    const overlappingReservation =
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


    if (overlappingReservation) {
      throw new ConflictException(
        'Car is already reserved for these dates',
      );
    }


    const reservation =
      this.reservationsRepository.create({

        userId: currentUser.userId,

        carId: car.id,

        startDate,

        endDate,

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



  // ADMIN: Get all reservations
  async findAll() {

    return this.reservationsRepository.find({

      relations: {
        user: true,
        car: true,
      },

    });

  }



  // USER: Cancel his reservation
  async cancel(
    id: number,
    userId: number,
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


    if (reservation.userId !== userId) {
      throw new BadRequestException(
        'You can only cancel your own reservation',
      );
    }


    reservation.status = 'CANCELLED' as any;


    return this.reservationsRepository.save(
      reservation,
    );

  }



  // ADMIN: Update reservation status
  async updateStatus(
    id: number,
    updateStatusDto: any,
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


    reservation.status =
      updateStatusDto.status;


    return this.reservationsRepository.save(
      reservation,
    );

  }

}