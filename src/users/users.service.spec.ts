import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { User } from './entities/user.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  const usersRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };
  const reservationsRepository = { count: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: usersRepository },
        {
          provide: getRepositoryToken(Reservation),
          useValue: reservationsRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('does not return password, tokens or verification data', async () => {
    const user = {
      id: 1,
      fullName: 'A',
      email: 'a@b.com',
      role: 'USER',
      isEmailVerified: false,
      passwordHash: 'hash',
      refreshToken: 'token',
      emailVerificationToken: 'code-hash',
      emailVerificationExpiresAt: new Date(),
      emailVerificationAttempts: 2,
    };
    usersRepository.find.mockResolvedValue([user]);
    usersRepository.findOne.mockResolvedValue(user);

    const expected = {
      id: 1,
      fullName: 'A',
      email: 'a@b.com',
      role: 'USER',
      isEmailVerified: false,
    };

    await expect(service.findAll()).resolves.toEqual([expected]);
    await expect(service.findOne(1)).resolves.toEqual(expected);
  });

  describe('remove', () => {
    const admin = { userId: 99, email: 'admin@b.com', role: 'ADMIN' };

    beforeEach(() => {
      usersRepository.findOne.mockResolvedValue({ id: 1 });
    });

    it('deletes a user without reservations', async () => {
      reservationsRepository.count.mockResolvedValue(0);

      await service.remove(1, admin);

      expect(usersRepository.remove).toHaveBeenCalled();
    });

    it('refuses to delete a user with reservations', async () => {
      reservationsRepository.count.mockResolvedValue(2);

      await expect(service.remove(1, admin)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(usersRepository.remove).not.toHaveBeenCalled();
    });
  });
});
