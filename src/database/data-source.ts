import 'dotenv/config';
import { DataSource } from 'typeorm';

import { User } from '../users/entities/user.entity';
import { Car } from '../cars/entities/car.entity';
import { CarCategory } from '../car-categories/entities/car-category.entity';

export default new DataSource({
  type: 'postgres',

  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME,

  entities: [User, Car, CarCategory],

  migrations: ['src/database/migrations/*.ts'],

  synchronize: false,
});