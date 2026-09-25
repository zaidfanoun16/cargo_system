import { IsEmail, Matches } from 'class-validator';

export class VerifyEmailDto {
  @IsEmail()
  email: string;

  // The 6-digit code sent to the user's email
  @Matches(/^\d{6}$/, { message: 'code must be 6 digits' })
  code: string;
}
