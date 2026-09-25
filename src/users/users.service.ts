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
  ) { }

  // Remove sensitive data before returning the user to the client
  private sanitizeUser(user: User) {
    const {
      passwordHash: _passwordHash,
      refreshToken: _refreshToken,
      emailVerificationToken: _emailVerificationToken,
      emailVerificationExpiresAt: _emailVerificationExpiresAt,
      emailVerificationAttempts: _emailVerificationAttempts,
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

    if (updateUserDto.email !== undefined) {
      user.email = updateUserDto.email;
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