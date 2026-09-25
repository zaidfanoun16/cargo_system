import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CarCategory } from './entities/car-category.entity';
import { Car } from '../cars/entities/car.entity';
import { CarCategoriesService } from './car-categories.service';

describe('CarCategoriesService', () => {
  let service: CarCategoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CarCategoriesService,
        { provide: getRepositoryToken(CarCategory), useValue: {} },
        { provide: getRepositoryToken(Car), useValue: {} },
      ],
    }).compile();

    service = module.get<CarCategoriesService>(CarCategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
