import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';

import { User } from '../users/entities/user.entity';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    private readonly jwtService: JwtService,

    private readonly emailService: EmailService,
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

    // Generate a secure random token for email verification
    const emailVerificationToken = randomBytes(32).toString('hex');

    // Set the verification token expiration time to 15 minutes
    const emailVerificationExpiresAt = new Date(
      Date.now() + 15 * 60 * 1000,
    );

    // Create the user
    // isEmailVerified remains false by default.
    const user = this.usersRepository.create({
      fullName: createUserDto.fullName,
      email: createUserDto.email,
      passwordHash,
      emailVerificationToken,
      emailVerificationExpiresAt,
    });

    // Save the user
    const savedUser = await this.usersRepository.save(user);

    // Send verification email
    await this.emailService.sendEmail(
      savedUser.email,
      'Verify your Cargo System account',
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
            Hi ${savedUser.fullName},
          </p>

          <p style="font-size: 15px; line-height: 1.6;">
            Please verify your email to activate your account.
          </p>

          <a
            href="http://localhost:3000/auth/verify-email?token=${savedUser.emailVerificationToken}"
            style="
              display: inline-block;
              margin: 20px 0;
              padding: 12px 24px;
              background-color: #2563eb;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              font-weight: bold;
            "
          >
            Verify Email
          </a>

          <p style="font-size: 13px; color: #777;">
            This link expires in 15 minutes.
          </p>

        </div>
      `,
    );

    // Remove sensitive fields from the response
    const {
      passwordHash: _passwordHash,
      emailVerificationToken: _emailVerificationToken,
      emailVerificationExpiresAt: _emailVerificationExpiresAt,
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
        expiresIn: '1d',
      },
    );

    // Generate refresh token
    const refreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
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
      ...safeUser
    } = user;

    // Return user data and tokens
    return {
      user: safeUser,
      accessToken,
      refreshToken,
    };
  }

  async verifyEmail(token: string) {
    // Reject if no token was provided
    if (!token) {
      throw new UnauthorizedException('Verification token is required');
    }

    // Find the user using the verification token
    const user = await this.usersRepository.findOne({
      where: {
        emailVerificationToken: token,
      },
    });

    // Reject if the token does not exist
    if (!user) {
      throw new UnauthorizedException('Invalid verification token');
    }

    // Reject if the token has expired
    if (
      !user.emailVerificationExpiresAt ||
      user.emailVerificationExpiresAt < new Date()
    ) {
      throw new UnauthorizedException(
        'Verification token has expired',
      );
    }

    // Mark the user's email as verified
    user.isEmailVerified = true;

    // Remove the token so it cannot be reused
    user.emailVerificationToken = null;
    user.emailVerificationExpiresAt = null;

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

    // Generate a new verification token
    const emailVerificationToken = randomBytes(32).toString('hex');

    // Set the new token expiration time to 15 minutes
    const emailVerificationExpiresAt = new Date(
      Date.now() + 15 * 60 * 1000,
    );

    // Update the user's verification information
    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationExpiresAt = emailVerificationExpiresAt;

    // Save the new token
    await this.usersRepository.save(user);

    // Send the new verification email
    await this.emailService.sendEmail(
      user.email,
      'Verify your Cargo System account',
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
            Verify Your Email 🚗
          </h2>

          <p style="font-size: 16px;">
            Hi ${user.fullName},
          </p>

          <p style="font-size: 15px; line-height: 1.6;">
            Here is your new verification link.
          </p>

          <a
            href="http://localhost:3000/auth/verify-email?token=${user.emailVerificationToken}"
            style="
              display: inline-block;
              margin: 20px 0;
              padding: 12px 24px;
              background-color: #2563eb;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              font-weight: bold;
            "
          >
            Verify Email
          </a>

          <p style="font-size: 13px; color: #777;">
            This link expires in 15 minutes.
          </p>

        </div>
      `,
    );

    return {
      message: 'Verification email sent successfully',
    };
  }

  async refreshAccessToken(refreshToken: string) {
    // Verify the refresh token
    const payload = await this.jwtService.verifyAsync(refreshToken);

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