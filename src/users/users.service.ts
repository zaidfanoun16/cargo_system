import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  // Create a new user in the database
  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create({
      fullName: createUserDto.fullName,
      email: createUserDto.email,
      passwordHash: createUserDto.password,
    });

    return this.usersRepository.save(user);
  }

  // Get all users from the database
  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  // Get one user by ID
  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  // Update an existing user
  async update(
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<User> {
    const user = await this.findOne(id);

    Object.assign(user, updateUserDto);

    return this.usersRepository.save(user);
  }

  // Delete a user from the database
  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);

    await this.usersRepository.remove(user);
  }
}