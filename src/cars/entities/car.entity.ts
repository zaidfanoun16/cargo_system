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

  @Column({ length: 50, unique: true })
  licensePlate: string;

  // Manufacturing year
  @Column()
  year: number;

  // Rental price per day
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  pricePerDay: number;

  @Column({ length: 100 })
  color: string;

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