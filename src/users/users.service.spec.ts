import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { hashVerificationCode } from '../common/verification/verification-code';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  const usersRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const reservationsRepository = { count: jest.fn() };
  const emailService = {
    sendVerificationCode: jest.fn(),
    sendWalkInWelcome: jest.fn(),
  };
  const notificationsService = { notify: jest.fn(), notifyAdmins: jest.fn() };

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
        { provide: EmailService, useValue: emailService },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: ConfigService, useValue: { get: () => undefined } },
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

  describe('updateRole', () => {
    it('refuses to change the role of the admin making the request', async () => {
      await expect(
        service.updateRole(1, { role: 'USER' }, 1),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(usersRepository.save).not.toHaveBeenCalled();
    });

    it("changes another user's role", async () => {
      usersRepository.findOne.mockResolvedValue({ id: 2, role: 'USER' });
      usersRepository.save.mockImplementation(async (user) => user);

      await expect(
        service.updateRole(2, { role: 'ADMIN' }, 1),
      ).resolves.toMatchObject({ id: 2, role: 'ADMIN' });
    });
  });

  describe('walk-in customer', () => {
    const dto = {
      fullName: 'Walk In',
      email: 'walk@in.com',
      phoneNumber: '0599123456'.replace(/^0/, '+970'),
    };

    beforeEach(() => {
      usersRepository.create.mockImplementation((data) => data);
      usersRepository.save.mockImplementation(async (data) => ({ id: 20, ...data }));
    });

    it('creates a verified account with a random password', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      const user = await service.createWalkInCustomer(dto);

      expect(user).toMatchObject({
        id: 20,
        fullName: 'Walk In',
        phoneNumber: '+970599123456',
        isEmailVerified: true,
      });
      expect(user).not.toHaveProperty('passwordHash');
      const saved = usersRepository.save.mock.calls[0][0];
      expect(saved.passwordHash).toMatch(/^\$2[aby]\$/);
      // Welcome email with the way to set a password
      expect(emailService.sendWalkInWelcome).toHaveBeenCalledWith(
        'walk@in.com',
        'Walk In',
      );
    });

    it('still creates the account when the welcome email fails', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      emailService.sendWalkInWelcome.mockRejectedValueOnce(new Error('Resend is down'));

      await expect(service.createWalkInCustomer(dto)).resolves.toMatchObject({
        id: 20,
      });
    });

    it('refuses an email that already has an account', async () => {
      usersRepository.findOne.mockResolvedValueOnce({ id: 2 });

      await expect(service.createWalkInCustomer(dto)).rejects.toThrow(
        'Email is already registered',
      );
    });

    it('refuses a phone number that already has an account', async () => {
      usersRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 2 });

      await expect(service.createWalkInCustomer(dto)).rejects.toThrow(
        'Phone number is already registered',
      );
    });
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

  describe('changePassword', () => {
    let user: { id: number; passwordHash: string; refreshToken: string | null };

    beforeEach(async () => {
      user = {
        id: 1,
        passwordHash: await bcrypt.hash('oldPassword1', 4),
        refreshToken: 'refresh-token',
      };
      usersRepository.findOne.mockResolvedValue(user);
    });

    it('changes the password when the current one is correct', async () => {
      await service.changePassword(1, {
        currentPassword: 'oldPassword1',
        newPassword: 'newPassword1',
      });

      expect(await bcrypt.compare('newPassword1', user.passwordHash)).toBe(true);
      // Other sessions are signed out
      expect(user.refreshToken).toBeNull();
      expect(usersRepository.save).toHaveBeenCalled();
    });

    it('rejects a wrong current password', async () => {
      await expect(
        service.changePassword(1, {
          currentPassword: 'wrongPassword',
          newPassword: 'newPassword1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(usersRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('email change', () => {
    let user: Record<string, any>;

    beforeEach(async () => {
      user = {
        id: 1,
        fullName: 'A',
        email: 'old@b.com',
        passwordHash: await bcrypt.hash('password123', 4),
        pendingEmail: null,
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
        emailVerificationAttempts: 0,
      };
      usersRepository.save.mockImplementation(async (u) => u);
    });

    it('sends a code to the new email without changing the email yet', async () => {
      usersRepository.findOne
        .mockResolvedValueOnce(user) // the current user
        .mockResolvedValueOnce(null); // new email is free

      await service.requestEmailChange(1, {
        newEmail: 'new@b.com',
        password: 'password123',
      });

      expect(user.email).toBe('old@b.com');
      expect(user.pendingEmail).toBe('new@b.com');
      expect(emailService.sendVerificationCode).toHaveBeenCalledWith(
        'new@b.com',
        'A',
        expect.stringMatching(/^\d{6}$/),
        expect.any(String),
      );
    });

    it('rejects a wrong password', async () => {
      usersRepository.findOne.mockResolvedValueOnce(user);

      await expect(
        service.requestEmailChange(1, {
          newEmail: 'new@b.com',
          password: 'wrong',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(emailService.sendVerificationCode).not.toHaveBeenCalled();
    });

    it('rejects an email used by another account', async () => {
      usersRepository.findOne
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce({ id: 2 });

      await expect(
        service.requestEmailChange(1, {
          newEmail: 'taken@b.com',
          password: 'password123',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('changes the email once the code is confirmed', async () => {
      Object.assign(user, {
        pendingEmail: 'new@b.com',
        verificationPurpose: 'email-change',
        emailVerificationToken: hashVerificationCode('123456'),
        emailVerificationExpiresAt: new Date(Date.now() + 60_000),
      });
      usersRepository.findOne
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(null);

      await service.confirmEmailChange(1, '123456');

      expect(user.email).toBe('new@b.com');
      expect(user.pendingEmail).toBeNull();
      expect(user.emailVerificationToken).toBeNull();
    });

    it('keeps the old email when the code is wrong', async () => {
      Object.assign(user, {
        pendingEmail: 'new@b.com',
        verificationPurpose: 'email-change',
        emailVerificationToken: hashVerificationCode('123456'),
        emailVerificationExpiresAt: new Date(Date.now() + 60_000),
      });
      usersRepository.findOne.mockResolvedValueOnce(user);

      await expect(
        service.confirmEmailChange(1, '000000'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(user.email).toBe('old@b.com');
      expect(user.emailVerificationAttempts).toBe(1);
    });
  });

  describe('deleteUnverifiedAccounts', () => {
    // Freeze the clock so the cutoff can be checked exactly
    const now = new Date('2030-01-15T12:00:00Z');

    beforeEach(() => jest.useFakeTimers({ now }));
    afterEach(() => jest.useRealTimers());

    it('deletes unverified accounts untouched for 7 days', async () => {
      const query = {
        delete: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 3 }),
      };
      usersRepository.createQueryBuilder.mockReturnValue(query);

      await expect(service.deleteUnverifiedAccounts()).resolves.toBe(3);

      expect(query.where).toHaveBeenCalledWith('"isEmailVerified" = false');
      const cutoff: Date = query.andWhere.mock.calls[0][1].cutoff;
      expect(cutoff).toEqual(new Date('2030-01-08T12:00:00Z'));
    });
  });
});
