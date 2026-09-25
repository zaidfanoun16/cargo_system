import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeEmailDto } from './dto/change-email.dto';
import { EmailService } from '../email/email.service';
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
  ) { }

  // Remove sensitive data before returning the user to the client
  private sanitizeUser(user: User) {
    const {
      passwordHash: _passwordHash,
      refreshToken: _refreshToken,
      emailVerificationToken: _emailVerificationToken,
      emailVerificationExpiresAt: _emailVerificationExpiresAt,
      emailVerificationAttempts: _emailVerificationAttempts,
      pendingEmail: _pendingEmail,
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
    const code = setVerificationCode(user);

    await this.usersRepository.save(user);

    await this.emailService.sendVerificationCode(
      changeEmailDto.newEmail,
      user.fullName,
      code,
      'Enter this code to confirm your new email:',
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

    const result = checkVerificationCode(user, code);

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

  // Update user role (ADMIN only)
  async updateRole(
    id: number,
    updateUserRoleDto: { role: 'USER' | 'ADMIN' },
  ) {
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