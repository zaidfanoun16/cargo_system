import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';

import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeEmailDto } from './dto/change-email.dto';
import { CreateWalkInCustomerDto } from './dto/create-walk-in-customer.dto';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { normalizePhoneNumber } from '../common/phone/phone-number';
import {
  checkVerificationCode,
  clearVerificationCode,
  setVerificationCode,
} from '../common/verification/verification-code';
import { User } from './entities/user.entity';
import { Reservation } from '../reservations/entities/reservation.entity';

type CurrentUser = {
  userId: number;
  email: string;
  role: string;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Reservation)
    private readonly reservationsRepository: Repository<Reservation>,

    private readonly emailService: EmailService,

    private readonly notificationsService: NotificationsService,

    private readonly configService: ConfigService,
  ) { }

  private readonly logger = new Logger(UsersService.name);

  // Remove sensitive data before returning the user to the client
  private sanitizeUser(user: User) {
    const {
      passwordHash: _passwordHash,
      refreshToken: _refreshToken,
      emailVerificationToken: _emailVerificationToken,
      emailVerificationExpiresAt: _emailVerificationExpiresAt,
      emailVerificationAttempts: _emailVerificationAttempts,
      pendingEmail: _pendingEmail,
      verificationPurpose: _verificationPurpose,
      ...safeUser
    } = user;

    return safeUser;
  }

  // Get all users
  async findAll() {
    const users = await this.usersRepository.find();

    // Remove passwordHash from every user
    return users.map((user) => this.sanitizeUser(user));
  }

  // Get one user by ID
  async findOne(id: number) {
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.sanitizeUser(user);
  }

  // Update user data
  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    currentUser: CurrentUser,
  ) {
    // Find the user we want to update
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Only the owner or an ADMIN can update this account
    const isOwner = currentUser.userId === id;
    const isAdmin = currentUser.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'You can only update your own account',
      );
    }

    // Update normal fields only if they were provided
    if (updateUserDto.fullName !== undefined) {
      user.fullName = updateUserDto.fullName;
    }

    if (updateUserDto.phoneNumber !== undefined) {
      const phoneNumber = normalizePhoneNumber(updateUserDto.phoneNumber);

      const phoneOwner = await this.usersRepository.findOne({
        where: { phoneNumber },
      });

      if (phoneOwner && phoneOwner.id !== user.id) {
        throw new ConflictException('Phone number is already registered');
      }

      user.phoneNumber = phoneNumber;
    }

    const updatedUser = await this.usersRepository.save(user);

    // Return updated user without passwordHash
    return this.sanitizeUser(updatedUser);
  }

  // Change the current user's password (requires the current password)
  async changePassword(
    userId: number,
    changePasswordDto: ChangePasswordDto,
  ) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Someone using an unattended logged-in session must not be able to
    // take over the account
    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    user.passwordHash = await bcrypt.hash(
      changePasswordDto.newPassword,
      10,
    );

    // Sign out other sessions: their refresh token stops working
    user.refreshToken = null;

    await this.usersRepository.save(user);

    return {
      message: 'Password changed successfully',
    };
  }

  // Step 1 of changing the email: check the password and send a code to
  // the new email. The email only changes once that code is confirmed.
  async requestEmailChange(
    userId: number,
    changeEmailDto: ChangeEmailDto,
  ) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const isPasswordValid = await bcrypt.compare(
      changeEmailDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Password is incorrect');
    }

    if (changeEmailDto.newEmail === user.email) {
      throw new BadRequestException(
        'New email must be different from the current email',
      );
    }

    await this.ensureEmailIsFree(changeEmailDto.newEmail);

    user.pendingEmail = changeEmailDto.newEmail;
    const code = setVerificationCode(user, 'email-change');

    await this.usersRepository.save(user);

    await this.emailService.sendVerificationCode(
      changeEmailDto.newEmail,
      user.fullName,
      code,
      'أدخل هذا الرمز لتأكيد بريدك الإلكتروني الجديد:',
    );

    return {
      message: 'Verification code sent to the new email',
    };
  }

  // Step 2 of changing the email: confirm the code sent to the new email
  async confirmEmailChange(userId: number, code: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user || !user.pendingEmail) {
      throw new BadRequestException('No email change was requested');
    }

    const result = checkVerificationCode(user, code, 'email-change');

    if (result === 'too-many-attempts') {
      throw new BadRequestException(
        'Too many wrong attempts, please request a new code',
      );
    }

    if (result !== 'valid') {
      // Save the incremented attempts counter
      if (result === 'wrong') {
        await this.usersRepository.save(user);
      }

      throw new BadRequestException(
        'Invalid or expired verification code',
      );
    }

    // Someone may have registered this email while the code was pending
    await this.ensureEmailIsFree(user.pendingEmail);

    user.email = user.pendingEmail;
    user.pendingEmail = null;
    clearVerificationCode(user);

    const updatedUser = await this.usersRepository.save(user);

    return this.sanitizeUser(updatedUser);
  }

  private async ensureEmailIsFree(email: string) {
    const existingUser = await this.usersRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email is already in use');
    }
  }

  // Every day at 3 AM, delete accounts that were never verified, so
  // abandoned registrations do not pile up. An account is deleted when
  // UNVERIFIED_ACCOUNT_TTL_DAYS (default 7) have passed since it last
  // changed; registering again or asking for a new code resets that.
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async deleteUnverifiedAccounts() {
    const ttlDays = Number(
      this.configService.get<string>('UNVERIFIED_ACCOUNT_TTL_DAYS') || 7,
    );

    const cutoff = new Date(Date.now() - ttlDays * 24 * 60 * 60 * 1000);

    const result = await this.usersRepository
      .createQueryBuilder()
      .delete()
      .from(User)
      .where('"isEmailVerified" = false')
      .andWhere('"updatedAt" < :cutoff', { cutoff })
      // Never delete an account that has reservations
      .andWhere(
        'NOT EXISTS (SELECT 1 FROM "reservations" r WHERE r."userId" = "users"."id")',
      )
      .execute();

    const deleted = result.affected ?? 0;

    if (deleted > 0) {
      this.logger.log(`Deleted ${deleted} unverified account(s)`);
    }

    return deleted;
  }

  // Update user role (ADMIN only)
  async updateRole(
    id: number,
    updateUserRoleDto: { role: 'USER' | 'ADMIN' },
    currentUserId: number,
  ) {
    // An admin removing their own role could leave nobody able to manage
    // the site, so another admin has to do it
    if (id === currentUserId) {
      throw new ForbiddenException('You cannot change your own role');
    }

    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    user.role = updateUserRoleDto.role;

    const updatedUser = await this.usersRepository.save(user);

    return this.sanitizeUser(updatedUser);
  }

  // A customer who comes to the office without an account (ADMIN only).
  // The staff saw their ID, so the email counts as verified; the account
  // gets a random password, and a welcome email leads the customer to
  // "forgot password" to set their own.
  async createWalkInCustomer(dto: CreateWalkInCustomerDto) {
    const phoneNumber = normalizePhoneNumber(dto.phoneNumber);

    if (await this.usersRepository.findOne({ where: { email: dto.email } })) {
      throw new ConflictException('Email is already registered');
    }

    if (await this.usersRepository.findOne({ where: { phoneNumber } })) {
      throw new ConflictException('Phone number is already registered');
    }

    const user = this.usersRepository.create({
      fullName: dto.fullName,
      email: dto.email,
      phoneNumber,
      isEmailVerified: true,
      passwordHash: await bcrypt.hash(randomBytes(24).toString('hex'), 10),
    });

    const savedUser = await this.usersRepository.save(user);

    // Tell the customer they have an account and how to set a password.
    // The account is already made, so a failed email is only logged.
    try {
      await this.emailService.sendWalkInWelcome(savedUser.email, savedUser.fullName);
    } catch (error) {
      this.logger.warn(
        `Could not send the welcome email to user ${savedUser.id}: ${(error as Error).message}`,
      );
    }

    return this.sanitizeUser(savedUser);
  }

  // Stop a user from booking, or allow them again (ADMIN only).
  // Allowing again starts a clean record: earlier late cancellations and
  // no-shows no longer count towards the next block.
  async updateBookingAccess(id: number, blocked: boolean) {
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    user.bookingBlocked = blocked;

    if (!blocked) {
      user.strikesResetAt = new Date();
    }

    const updatedUser = await this.usersRepository.save(user);

    await this.notificationsService.notify(
      id,
      blocked ? 'BOOKING_BLOCKED' : 'BOOKING_ALLOWED',
    );

    return this.sanitizeUser(updatedUser);
  }

  // Delete user
  async remove(
    id: number,
    currentUser: CurrentUser,
  ): Promise<void> {
    // Only the owner or an ADMIN can delete this account
    const isOwner = currentUser.userId === id;
    const isAdmin = currentUser.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'You can only delete your own account',
      );
    }

    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Reservations reference the user, so deleting them would fail and
    // erase the rental history
    const reservationsCount = await this.reservationsRepository.count({
      where: { userId: id },
    });

    if (reservationsCount > 0) {
      throw new ConflictException(
        'Cannot delete user because they have reservations.',
      );
    }

    await this.usersRepository.remove(user);
  }
}