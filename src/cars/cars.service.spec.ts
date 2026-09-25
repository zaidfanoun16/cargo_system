import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Car } from './entities/car.entity';
import { CarCategory } from '../car-categories/entities/car-category.entity';
import { CarsService } from './cars.service';

describe('CarsService', () => {
  let service: CarsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CarsService,
        { provide: getRepositoryToken(Car), useValue: {} },
        { provide: getRepositoryToken(CarCategory), useValue: {} },
      ],
    }).compile();

    service = module.get<CarsService>(CarsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
