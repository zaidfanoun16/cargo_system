import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/entities/user.entity';
import { AuthService } from './auth.service';
import { EmailService } from '../email/email.service';

describe('AuthService', () => {
  let service: AuthService;

  const usersRepository = { findOne: jest.fn() };
  const jwtService = { verifyAsync: jest.fn(), signAsync: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: JwtService, useValue: jwtService },
        { provide: EmailService, useValue: {} },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('refreshAccessToken', () => {
    it('returns a new access token for a valid refresh token', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 1, type: 'refresh' });
      usersRepository.findOne.mockResolvedValue({
        id: 1,
        email: 'a@b.com',
        role: 'USER',
        refreshToken: 'stored-token',
      });
      jwtService.signAsync.mockResolvedValue('new-access-token');

      await expect(
        service.refreshAccessToken('stored-token'),
      ).resolves.toEqual({ accessToken: 'new-access-token' });
    });

    it('rejects an invalid or expired token with 401', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(
        service.refreshAccessToken('bad-token'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an access token sent as a refresh token', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: 1,
        email: 'a@b.com',
        role: 'USER',
      });

      await expect(
        service.refreshAccessToken('access-token'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(usersRepository.findOne).not.toHaveBeenCalled();
    });
  });
});
