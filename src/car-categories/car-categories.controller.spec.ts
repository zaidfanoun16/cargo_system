import { Test, TestingModule } from '@nestjs/testing';
import { CarCategoriesController } from './car-categories.controller';
import { CarCategoriesService } from './car-categories.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('CarCategoriesController', () => {
  let controller: CarCategoriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CarCategoriesController],
      providers: [{ provide: CarCategoriesService, useValue: {} }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CarCategoriesController>(CarCategoriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
