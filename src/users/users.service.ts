import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

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

    // If a new password was provided, hash it before saving
    if (updateUserDto.password !== undefined) {
      user.passwordHash = await bcrypt.hash(
        updateUserDto.password,
        10,
      );
    }

    const updatedUser = await this.usersRepository.save(user);

    // Return updated user without passwordHash
    return this.sanitizeUser(updatedUser);
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

    await this.usersRepository.remove(user);
  }
}