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

import { User } from '../users/entities/user.entity';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { EmailService } from '../email/email.service';
import { normalizePhoneNumber } from '../common/phone/phone-number';
import {
  checkVerificationCode,
  clearVerificationCode,
  setVerificationCode,
} from '../common/verification/verification-code';

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

    const phoneNumber = normalizePhoneNumber(createUserDto.phoneNumber);

    // One account per WhatsApp number (the unverified account being
    // replaced below may already use it)
    const phoneOwner = await this.usersRepository.findOne({
      where: { phoneNumber },
    });

    if (phoneOwner && phoneOwner.id !== existingUser?.id) {
      throw new ConflictException('Phone number is already registered');
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
    user.phoneNumber = phoneNumber;

    const code = setVerificationCode(user, 'register');

    // Save the user
    const savedUser = await this.usersRepository.save(user);

    // Send the verification code
    await this.emailService.sendVerificationCode(
      savedUser.email,
      savedUser.fullName,
      code,
    );

    // Remove sensitive fields from the response
    const {
      passwordHash: _passwordHash,
      emailVerificationToken: _emailVerificationToken,
      emailVerificationExpiresAt: _emailVerificationExpiresAt,
      emailVerificationAttempts: _emailVerificationAttempts,
      pendingEmail: _pendingEmail,
      verificationPurpose: _verificationPurpose,
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
      pendingEmail: _pendingEmail,
      verificationPurpose: _verificationPurpose,
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

    // Reject if the user does not exist or is already verified
    if (!user || user.isEmailVerified) {
      throw invalidCode;
    }

    const result = checkVerificationCode(user, code, 'register');

    // Stop guessing: after too many wrong attempts a new code is required
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

      throw invalidCode;
    }

    // Mark the user's email as verified
    user.isEmailVerified = true;

    // Remove the code so it cannot be reused
    clearVerificationCode(user);

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
    const code = setVerificationCode(user, 'register');

    // Save the new code
    await this.usersRepository.save(user);

    // Send the new code
    await this.emailService.sendVerificationCode(
      user.email,
      user.fullName,
      code,
    );

    return {
      message: 'Verification code sent successfully',
    };
  }

  // Step 1 of resetting a forgotten password: email a code
  async forgotPassword(email: string) {
    // Same response whether or not the email exists, so this endpoint
    // cannot be used to find out who has an account
    const response = {
      message: 'If this email is registered, a reset code has been sent',
    };

    const user = await this.usersRepository.findOne({
      where: { email },
    });

    if (!user) {
      return response;
    }

    // Replaces any other pending code, including an email change
    user.pendingEmail = null;
    const code = setVerificationCode(user, 'password-reset');

    await this.usersRepository.save(user);

    await this.emailService.sendVerificationCode(
      user.email,
      user.fullName,
      code,
      'أدخل هذا الرمز لإعادة تعيين كلمة المرور:',
    );

    return response;
  }

  // Step 2 of resetting a forgotten password: set a new one with the code
  async resetPassword(
    email: string,
    code: string,
    newPassword: string,
  ) {
    const invalidCode = new BadRequestException(
      'Invalid or expired reset code',
    );

    const user = await this.usersRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw invalidCode;
    }

    const result = checkVerificationCode(user, code, 'password-reset');

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

      throw invalidCode;
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);

    // The code reached this inbox, which proves the user owns the email
    user.isEmailVerified = true;

    // Sign out every session: their refresh token stops working
    user.refreshToken = null;

    clearVerificationCode(user);

    await this.usersRepository.save(user);

    return {
      message: 'Password reset successfully',
    };
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