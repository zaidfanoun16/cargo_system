import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/entities/user.entity';
import { AuthService } from './auth.service';
import { EmailService } from '../email/email.service';

describe('AuthService', () => {
  let service: AuthService;

  const usersRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const emailService = { sendVerificationCode: jest.fn() };
  const jwtService = { verifyAsync: jest.fn(), signAsync: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: JwtService, useValue: jwtService },
        { provide: EmailService, useValue: emailService },
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

  describe('email verification', () => {
    const hash = (code: string) =>
      createHash('sha256').update(code).digest('hex');

    const pendingUser = () => ({
      id: 1,
      email: 'a@b.com',
      fullName: 'A',
      isEmailVerified: false,
      emailVerificationToken: hash('123456'),
      emailVerificationExpiresAt: new Date(Date.now() + 60_000),
      emailVerificationAttempts: 0,
      verificationPurpose: 'register',
    });

    beforeEach(() => {
      usersRepository.save.mockImplementation(async (user) => user);
    });

    it('verifies the email with the correct code', async () => {
      const user = pendingUser();
      usersRepository.findOne.mockResolvedValue(user);

      await service.verifyEmail('a@b.com', '123456');

      expect(user.isEmailVerified).toBe(true);
      expect(user.emailVerificationToken).toBeNull();
    });

    it('counts a wrong code as a failed attempt', async () => {
      const user = pendingUser();
      usersRepository.findOne.mockResolvedValue(user);

      await expect(
        service.verifyEmail('a@b.com', '000000'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(user.emailVerificationAttempts).toBe(1);
      expect(user.isEmailVerified).toBe(false);
    });

    it('rejects even the correct code after 5 wrong attempts', async () => {
      const user = { ...pendingUser(), emailVerificationAttempts: 5 };
      usersRepository.findOne.mockResolvedValue(user);

      await expect(
        service.verifyEmail('a@b.com', '123456'),
      ).rejects.toThrow('Too many wrong attempts');
      expect(user.isEmailVerified).toBe(false);
    });

    it('rejects an expired code', async () => {
      const user = {
        ...pendingUser(),
        emailVerificationExpiresAt: new Date(Date.now() - 1),
      };
      usersRepository.findOne.mockResolvedValue(user);

      await expect(
        service.verifyEmail('a@b.com', '123456'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(user.isEmailVerified).toBe(false);
    });

    it('emails a 6-digit code and stores only its hash', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      usersRepository.create.mockReturnValue({});

      await service.register({
        fullName: 'A',
        email: 'a@b.com',
        password: 'password123',
        phoneNumber: '+970591234567',
      });

      const code: string = emailService.sendVerificationCode.mock.calls[0][2];

      expect(code).toMatch(/^\d{6}$/);
      const savedUser = usersRepository.save.mock.calls[0][0];

      expect(savedUser.emailVerificationToken).toBe(hash(code));
      expect(savedUser.emailVerificationToken).not.toBe(code);
    });

    it('replaces an unverified account that registers again', async () => {
      const user = pendingUser();
      usersRepository.findOne.mockResolvedValue(user);

      await service.register({
        fullName: 'New Name',
        email: 'a@b.com',
        password: 'password123',
        phoneNumber: '+970591234567',
      });

      expect(usersRepository.create).not.toHaveBeenCalled();
      expect(usersRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, fullName: 'New Name' }),
      );
    });

    it('rejects registering an already verified email', async () => {
      usersRepository.findOne.mockResolvedValue({
        ...pendingUser(),
        isEmailVerified: true,
      });

      await expect(
        service.register({
          fullName: 'A',
          email: 'a@b.com',
          password: 'password123',
          phoneNumber: '+970591234567',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('password reset', () => {
    const hash = (code: string) =>
      createHash('sha256').update(code).digest('hex');

    const userWithCode = (purpose: string) => ({
      id: 1,
      email: 'a@b.com',
      fullName: 'A',
      isEmailVerified: true,
      passwordHash: 'old-hash',
      refreshToken: 'refresh-token',
      pendingEmail: null,
      emailVerificationToken: hash('123456'),
      emailVerificationExpiresAt: new Date(Date.now() + 60_000),
      emailVerificationAttempts: 0,
      verificationPurpose: purpose,
    });

    beforeEach(() => {
      usersRepository.save.mockImplementation(async (user) => user);
    });

    it('emails a reset code to a registered user', async () => {
      const user = { ...userWithCode('register'), emailVerificationToken: null };
      usersRepository.findOne.mockResolvedValue(user);

      await service.forgotPassword('a@b.com');

      expect(user.verificationPurpose).toBe('password-reset');
      expect(emailService.sendVerificationCode).toHaveBeenCalled();
    });

    it('gives the same answer for an unknown email and sends nothing', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.forgotPassword('nobody@b.com')).resolves.toEqual({
        message: 'If this email is registered, a reset code has been sent',
      });
      expect(emailService.sendVerificationCode).not.toHaveBeenCalled();
    });

    it('sets the new password and signs out sessions', async () => {
      const user = userWithCode('password-reset');
      usersRepository.findOne.mockResolvedValue(user);

      await service.resetPassword('a@b.com', '123456', 'newPassword1');

      expect(await bcrypt.compare('newPassword1', user.passwordHash)).toBe(true);
      expect(user.refreshToken).toBeNull();
      expect(user.emailVerificationToken).toBeNull();
    });

    it('rejects a code that was sent for an email change', async () => {
      const user = userWithCode('email-change');
      usersRepository.findOne.mockResolvedValue(user);

      await expect(
        service.resetPassword('a@b.com', '123456', 'newPassword1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(user.passwordHash).toBe('old-hash');
    });
  });

  describe('phone number at registration', () => {
    beforeEach(() => {
      usersRepository.save.mockImplementation(async (user) => user);
      usersRepository.create.mockReturnValue({});
    });

    it('stores the WhatsApp number in international format', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await service.register({
        fullName: 'A',
        email: 'a@b.com',
        password: 'password123',
        phoneNumber: '+970 59-123-4567',
      });

      expect(usersRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ phoneNumber: '+970591234567' }),
      );
    });

    it('rejects a number already used by another account', async () => {
      usersRepository.findOne
        .mockResolvedValueOnce(null) // email is free
        .mockResolvedValueOnce({ id: 9 }); // phone belongs to user 9

      await expect(
        service.register({
          fullName: 'A',
          email: 'a@b.com',
          password: 'password123',
          phoneNumber: '+970591234567',
        }),
      ).rejects.toThrow('Phone number is already registered');
      expect(usersRepository.save).not.toHaveBeenCalled();
    });
  });
});
