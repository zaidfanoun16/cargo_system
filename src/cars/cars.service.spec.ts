import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Car } from './entities/car.entity';
import { CarCategory } from '../car-categories/entities/car-category.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { CarsService } from './cars.service';
import { CarImage } from './entities/car-image.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

describe('CarsService', () => {
  let service: CarsService;

  const carsRepository = { findOne: jest.fn(), remove: jest.fn() };
  const reservationsRepository = { count: jest.fn() };
  const carImagesRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };
  const cloudinaryService = { uploadImage: jest.fn(), deleteImage: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CarsService,
        { provide: getRepositoryToken(Car), useValue: carsRepository },
        { provide: getRepositoryToken(CarCategory), useValue: {} },
        {
          provide: getRepositoryToken(Reservation),
          useValue: reservationsRepository,
        },
        {
          provide: getRepositoryToken(CarImage),
          useValue: carImagesRepository,
        },
        { provide: CloudinaryService, useValue: cloudinaryService },
      ],
    }).compile();

    service = module.get<CarsService>(CarsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('remove', () => {
    beforeEach(() => {
      carsRepository.findOne.mockResolvedValue({
        id: 5,
        images: [{ publicId: 'cars/a' }],
      });
    });

    it('deletes a car without reservations', async () => {
      reservationsRepository.count.mockResolvedValue(0);

      await service.remove(5);

      expect(carsRepository.remove).toHaveBeenCalled();
      // Its photos are deleted from Cloudinary too
      expect(cloudinaryService.deleteImage).toHaveBeenCalledWith('cars/a');
    });

    it('refuses to delete a car with reservations', async () => {
      reservationsRepository.count.mockResolvedValue(1);

      await expect(service.remove(5)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(carsRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('images', () => {
    const file = { buffer: Buffer.from('x') } as Express.Multer.File;

    it('uploads each file and saves its URL', async () => {
      carsRepository.findOne.mockResolvedValue({ id: 5, images: [] });
      cloudinaryService.uploadImage.mockResolvedValue({
        url: 'https://res.cloudinary.com/x.jpg',
        publicId: 'cars/x',
      });
      carImagesRepository.create.mockImplementation((data) => data);

      await service.addImages(5, [file, file]);

      expect(cloudinaryService.uploadImage).toHaveBeenCalledTimes(2);
      expect(carImagesRepository.save).toHaveBeenCalledWith({
        url: 'https://res.cloudinary.com/x.jpg',
        publicId: 'cars/x',
        carId: 5,
      });
    });

    it('refuses more than 10 images per car', async () => {
      carsRepository.findOne.mockResolvedValue({
        id: 5,
        images: Array.from({ length: 9 }, () => ({})),
      });

      await expect(service.addImages(5, [file, file])).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(cloudinaryService.uploadImage).not.toHaveBeenCalled();
    });

    it('deletes an image from Cloudinary and the database', async () => {
      const image = { id: 3, carId: 5, publicId: 'cars/y' };
      carImagesRepository.findOne.mockResolvedValue(image);

      await service.removeImage(5, 3);

      expect(cloudinaryService.deleteImage).toHaveBeenCalledWith('cars/y');
      expect(carImagesRepository.remove).toHaveBeenCalledWith(image);
    });
  });
});
