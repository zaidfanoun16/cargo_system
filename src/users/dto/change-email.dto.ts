import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class ChangeEmailDto {
  @IsEmail()
  @MaxLength(150)
  newEmail: string;

  // Current password, so an unattended session cannot change the email
  @IsString()
  @IsNotEmpty()
  password: string;
}
