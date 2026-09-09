import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

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

  // Manufacturing year
  @Column()
  year: number;

  // Rental price per day
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  pricePerDay: number;

  // Current car status
  @Column({ default: 'AVAILABLE' })
  status: string;

  // Record creation date
  @CreateDateColumn()
  createdAt: Date;

  // Record last update date
  @UpdateDateColumn()
  updatedAt: Date;
}
