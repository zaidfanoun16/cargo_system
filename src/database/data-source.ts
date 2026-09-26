import 'dotenv/config';

import { DataSource } from 'typeorm';

import { User } from '../users/entities/user.entity';
import { Car } from '../cars/entities/car.entity';
import { CarImage } from '../cars/entities/car-image.entity';
import { CarCategory } from '../car-categories/entities/car-category.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Review } from '../reviews/entities/review.entity';
import { Favorite } from '../favorites/entities/favorite.entity';
import { Notification } from '../notifications/entities/notification.entity';


export default new DataSource({

  type: 'postgres',

  // Hosted databases give one connection string (DATABASE_URL)
  url: process.env.DATABASE_URL || undefined,

  host: process.env.DB_HOST,

  port: Number(process.env.DB_PORT),

  username: process.env.DB_USERNAME,

  password: process.env.DB_PASSWORD || '',

  database: process.env.DB_NAME,

  // Hosted databases require an encrypted connection
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,

  entities: [
    User,
    Car,
    CarImage,
    CarCategory,
    Reservation,
    Review,
    Favorite,
    Notification,
  ],

  migrations: [
    'src/database/migrations/*.ts'
  ],

  synchronize: false,

});