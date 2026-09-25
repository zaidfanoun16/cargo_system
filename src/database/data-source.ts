import 'dotenv/config';

import { DataSource } from 'typeorm';

import { User } from '../users/entities/user.entity';
import { Car } from '../cars/entities/car.entity';
import { CarImage } from '../cars/entities/car-image.entity';
import { CarCategory } from '../car-categories/entities/car-category.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Review } from '../reviews/entities/review.entity';
import { Favorite } from '../favorites/entities/favorite.entity';


export default new DataSource({

  type: 'postgres',

  host: process.env.DB_HOST,

  port: Number(process.env.DB_PORT),

  username: process.env.DB_USERNAME,

  password: process.env.DB_PASSWORD || '',

  database: process.env.DB_NAME,

  entities: [
    User,
    Car,
    CarImage,
    CarCategory,
    Reservation,
    Review,
    Favorite,
  ],

  migrations: [
    'src/database/migrations/*.ts'
  ],

  synchronize: false,

});