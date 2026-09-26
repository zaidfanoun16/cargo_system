import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
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


  // Price before the duration discount.
  // PostgreSQL returns decimals as strings, so convert them to numbers.
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  basePrice: number;


  // Discount for long rentals, in percent (0, 10 or 20)
  @Column({ type: 'smallint', default: 0 })
  discountPercent: number;


  // Price the customer pays (basePrice minus the discount), fixed when the
  // reservation is created so later price changes do not affect it.
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  totalPrice: number;


  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.PENDING,
  })
  status: ReservationStatus;


  // True when the customer cancelled a CONFIRMED reservation after the
  // free cancellation period (see reservation-policy.ts)
  @Column({ default: false })
  lateCancellation: boolean;


  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date | null;


  // When the car was handed over to the customer, and when it came back
  @Column({ type: 'timestamp', nullable: true })
  pickedUpAt: Date | null;


  // 6-digit code the customer shows (as a QR code) to pick up the car.
  // Set when the reservation is confirmed, and unique among CONFIRMED
  // reservations.
  @Index()
  @Column({ type: 'varchar', length: 6, nullable: true })
  handoverCode: string | null;


  // The customer said they are running late, so the car is kept for
  // them a little longer (RUNNING_LATE_EXTRA_HOURS)
  @Column({ default: false })
  runningLate: boolean;


  @Column({ type: 'timestamp', nullable: true })
  returnedAt: Date | null;


  // The staff member who handed the car over, and who took it back
  // (shown on the receipts)
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pickedUpById' })
  pickedUpBy: User | null;


  @Column({ type: 'int', nullable: true })
  pickedUpById: number | null;


  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'returnedById' })
  returnedBy: User | null;


  @Column({ type: 'int', nullable: true })
  returnedById: number | null;


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