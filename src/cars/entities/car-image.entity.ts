import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Car } from './car.entity';

@Entity('car_images')
export class CarImage {
  @PrimaryGeneratedColumn()
  id: number;

  // Public HTTPS URL of the image
  @Column({ type: 'text' })
  url: string;

  // Cloudinary ID, needed to delete the file from Cloudinary
  @Column({ type: 'text' })
  publicId: string;

  @ManyToOne(() => Car, (car) => car.images, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'carId' })
  car: Car;

  @Column()
  carId: number;

  @CreateDateColumn()
  createdAt: Date;
}
