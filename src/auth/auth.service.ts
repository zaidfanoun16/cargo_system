import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { createHash, randomInt, timingSafeEqual } from 'crypto';

import { User } from '../users/entities/user.entity';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { EmailService } from '../email/email.service';

// How long a verification code stays valid
const VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000;

// Wrong attempts allowed before the user must request a new code
const MAX_VERIFICATION_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    private readonly jwtService: JwtService,

    private readonly emailService: EmailService,
  ) { }

  async register(createUserDto: CreateUserDto) {
    // Check if the email is already registered
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser?.isEmailVerified) {
      throw new ConflictException('Email is already registered');
    }

    // Hash the user's password before storing it
    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    // An unverified account with this email is replaced, so an abandoned
    // registration does not block the email forever.
    // isEmailVerified remains false by default.
    const user = existingUser ?? this.usersRepository.create();
    user.fullName = createUserDto.fullName;
    user.email = createUserDto.email;
    user.passwordHash = passwordHash;

    const code = this.setVerificationCode(user);

    // Save the user
    const savedUser = await this.usersRepository.save(user);

    // Send the verification code
    await this.sendVerificationCode(savedUser, code);

    // Remove sensitive fields from the response
    const {
      passwordHash: _passwordHash,
      emailVerificationToken: _emailVerificationToken,
      emailVerificationExpiresAt: _emailVerificationExpiresAt,
      emailVerificationAttempts: _emailVerificationAttempts,
      refreshToken: _refreshToken,
      ...safeUser
    } = savedUser;

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

    // Prevent unverified users from logging in
    if (!user.isEmailVerified) {
      throw new UnauthorizedException(
        'Please verify your email before logging in',
      );
    }

    // Generate access token
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      {
        expiresIn: '30m',
      },
    );

    // Generate refresh token
    const refreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        type: 'refresh',
      },
      {
        expiresIn: '7d',
      },
    );

    // Store the refresh token in the database
    user.refreshToken = refreshToken;
    await this.usersRepository.save(user);

    // Remove passwordHash and refresh token from response
    const {
      passwordHash,
      refreshToken: _refreshToken,
      emailVerificationToken: _emailVerificationToken,
      emailVerificationExpiresAt: _emailVerificationExpiresAt,
      emailVerificationAttempts: _emailVerificationAttempts,
      ...safeUser
    } = user;

    // Return user data and tokens
    return {
      user: safeUser,
      accessToken,
      refreshToken,
    };
  }

  async verifyEmail(email: string, code: string) {
    const invalidCode = new BadRequestException(
      'Invalid or expired verification code',
    );

    // Find the user by email
    const user = await this.usersRepository.findOne({
      where: { email },
    });

    // Reject if the user does not exist or has no pending code
    if (!user || user.isEmailVerified || !user.emailVerificationToken) {
      throw invalidCode;
    }

    // Reject if the code has expired
    if (
      !user.emailVerificationExpiresAt ||
      user.emailVerificationExpiresAt < new Date()
    ) {
      throw invalidCode;
    }

    // Stop guessing: after too many wrong attempts a new code is required
    if (user.emailVerificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
      throw new BadRequestException(
        'Too many wrong attempts, please request a new code',
      );
    }

    // Compare hashes in constant time
    const isCodeValid = timingSafeEqual(
      Buffer.from(this.hashVerificationCode(code)),
      Buffer.from(user.emailVerificationToken),
    );

    if (!isCodeValid) {
      user.emailVerificationAttempts += 1;
      await this.usersRepository.save(user);

      throw invalidCode;
    }

    // Mark the user's email as verified
    user.isEmailVerified = true;

    // Remove the code so it cannot be reused
    user.emailVerificationToken = null;
    user.emailVerificationExpiresAt = null;
    user.emailVerificationAttempts = 0;

    // Save the verified user
    await this.usersRepository.save(user);

    return {
      message: 'Email verified successfully',
    };
  }

  async resendVerification(email: string) {
    // Find the user by email
    const user = await this.usersRepository.findOne({
      where: { email },
    });

    // Reject if the email does not exist
    if (!user) {
      throw new UnauthorizedException('Invalid email');
    }

    // Reject if the email is already verified
    if (user.isEmailVerified) {
      throw new ConflictException('Email is already verified');
    }

    // Generate a new code and reset the attempts counter
    const code = this.setVerificationCode(user);

    // Save the new code
    await this.usersRepository.save(user);

    // Send the new code
    await this.sendVerificationCode(user, code);

    return {
      message: 'Verification code sent successfully',
    };
  }

  // Generate a new 6-digit code and store only its hash on the user.
  // Returns the plain code so it can be emailed.
  private setVerificationCode(user: User) {
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');

    user.emailVerificationToken = this.hashVerificationCode(code);
    user.emailVerificationExpiresAt = new Date(
      Date.now() + VERIFICATION_CODE_TTL_MS,
    );
    user.emailVerificationAttempts = 0;

    return code;
  }

  private hashVerificationCode(code: string) {
    return createHash('sha256').update(code).digest('hex');
  }

  private async sendVerificationCode(user: User, code: string) {
    await this.emailService.sendEmail(
      user.email,
      'Your Cargo System verification code',
      `
        <div style="
          font-family: Arial, sans-serif;
          max-width: 500px;
          margin: 0 auto;
          padding: 30px;
          text-align: center;
          color: #333;
        ">

          <h2 style="margin-bottom: 10px;">
            Welcome to Cargo System 🚗
          </h2>

          <p style="font-size: 16px;">
            Hi ${user.fullName},
          </p>

          <p style="font-size: 15px; line-height: 1.6;">
            Enter this code to verify your email:
          </p>

          <p style="
            margin: 20px 0;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #2563eb;
          ">
            ${code}
          </p>

          <p style="font-size: 13px; color: #777;">
            This code expires in 10 minutes.
          </p>

        </div>
      `,
    );
  }

  async refreshAccessToken(refreshToken: string) {
    // Verify the refresh token (expired or tampered tokens throw)
    let payload: { sub: number; type?: string };

    try {
      payload = await this.jwtService.verifyAsync(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Reject access tokens sent to the refresh endpoint
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Find the user
    const user = await this.usersRepository.findOne({
      where: { id: payload.sub },
    });

    // Reject if the user does not exist
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Make sure the provided token matches the stored token
    if (user.refreshToken !== refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Generate a new access token
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      {
        expiresIn: '1d',
      },
    );

    return {
      accessToken,
    };
  }
}