import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Car } from '../../cars/entities/car.entity';

@Entity('car_categories')
export class CarCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Arabic name and description, shown when the site is in Arabic
  @Column({ type: 'varchar', length: 100, nullable: true, unique: true })
  nameAr: string | null;

  @Column({ type: 'text', nullable: true })
  descriptionAr: string | null;

  // One category can contain many cars
  @OneToMany(() => Car, (car) => car.category)
  cars: Car[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
