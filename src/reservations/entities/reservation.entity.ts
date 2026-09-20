import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';
import { Car } from '../../cars/entities/car.entity';
import { ReservationStatus } from '../enums/reservation-status.enum';

@Entity('reservations')
export class Reservation {

  @PrimaryGeneratedColumn()
  id: number;


  @Column()
  startDate: Date;


  @Column()
  endDate: Date;


  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.PENDING,
  })
  status: ReservationStatus;


  // Reservation belongs to one user
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;


  @Column()
  userId: number;


  // Reservation belongs to one car
  @ManyToOne(() => Car)
  @JoinColumn({ name: 'carId' })
  car: Car;


  @Column()
  carId: number;


  @CreateDateColumn()
  createdAt: Date;


  @UpdateDateColumn()
  updatedAt: Date;
}