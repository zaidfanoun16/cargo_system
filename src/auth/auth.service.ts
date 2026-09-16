import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async validateUser(email: string, password: string) {
    // Find the user by email
    const user = await this.usersRepository.findOne({
      where: { email },
    });

    // Reject if the user does not exist
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Compare the entered password with the hashed password
    const isPasswordValid = await bcrypt.compare(
      password,
      user.passwordHash,
    );

    // Reject if the password is incorrect
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Never return passwordHash to the client
    const { passwordHash, ...safeUser } = user;

    return safeUser;
  }
}