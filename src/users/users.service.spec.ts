import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  const usersRepository = { find: jest.fn(), findOne: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: usersRepository },
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
});
