import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { IsInternationalPhoneNumber } from '../../common/phone/phone-number';

export class CreateUserDto {
  // User's full name is required.
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName: string;

  // Email must be valid and cannot be empty.
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(150)
  email: string;

  // Password must be a string with at least 8 characters.
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  // WhatsApp number with the country code, e.g. +970591234567
  @IsInternationalPhoneNumber()
  phoneNumber: string;
}
