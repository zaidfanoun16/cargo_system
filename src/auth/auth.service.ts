import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { User } from '../users/entities/user.entity';
import { CreateUserDto } from '../users/dto/create-user.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    private readonly jwtService: JwtService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    // Check if the email is already registered
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    // Hash the user's password before storing it
    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    // Create the user
    const user = this.usersRepository.create({
      fullName: createUserDto.fullName,
      email: createUserDto.email,
      passwordHash,
    });

    // Save the user
    const savedUser = await this.usersRepository.save(user);

    // Remove passwordHash from the response
    const { passwordHash: _, ...safeUser } = savedUser;

    return safeUser;
  }

  async validateUser(email: string, password: string) {
    // Find the user by email
    const user = await this.usersRepository.findOne({
      where: { email },
    });

    // Reject if the user does not exist
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Compare the entered password with the stored hash
    const isPasswordValid = await bcrypt.compare(
      password,
      user.passwordHash,
    );

    // Reject if the password is incorrect
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Create JWT payload
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    // Generate JWT token
    const accessToken = await this.jwtService.signAsync(payload);

    // Remove passwordHash from response
    const { passwordHash, ...safeUser } = user;

    // Return user data and token
    return {
      user: safeUser,
      accessToken,
    };
  }
}