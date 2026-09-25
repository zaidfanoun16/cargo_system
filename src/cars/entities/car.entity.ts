import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { CarCategory } from '../../car-categories/entities/car-category.entity';
import { CarStatus } from '../enums/car-status.enum';
import { CarImage } from './car-image.entity';

@Entity('cars')
export class Car {
  // Primary key for the car
  @PrimaryGeneratedColumn()
  id: number;

  // Car brand, for example: Toyota
  @Column({ length: 100 })
  brand: string;

  // Car model, for example: Corolla
  @Column({ length: 100 })
  model: string;

  // Arabic names shown when the site is in Arabic, e.g. تويوتا / كورولا.
  // Optional: the English name is shown when they are empty.
  @Column({ type: 'varchar', length: 100, nullable: true })
  brandAr: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  modelAr: string | null;

  @Column({ length: 50, unique: true })
  licensePlate: string;

  // Manufacturing year
  @Column()
  year: number;

  // Rental price per day.
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
  pricePerDay: number;

  // Rental price per hour, for reservations shorter than a day or the
  // hours left over after full days. Null: the car is rented by the day.
  // PostgreSQL returns decimals as strings, so convert them to numbers.
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value === null ? null : Number(value)),
    },
  })
  pricePerHour: number | null;

  @Column({ length: 100 })
  color: string;

  // Arabic color, e.g. أبيض
  @Column({ type: 'varchar', length: 100, nullable: true })
  colorAr: string | null;

  // Current car status
  @Column({
    type: 'enum',
    enum: CarStatus,
    default: CarStatus.AVAILABLE,
  })
  status: CarStatus;

  // Each car belongs to one category
  @ManyToOne(() => CarCategory, (category) => category.cars, {
    nullable: false,
  })
  @JoinColumn({ name: 'categoryId' })
  category: CarCategory;

  // Photos of the car, oldest first
  @OneToMany(() => CarImage, (image) => image.car)
  images: CarImage[];

  // Record creation date
  @CreateDateColumn()
  createdAt: Date;

  // Record last update date
  @UpdateDateColumn()
  updatedAt: Date;
}
