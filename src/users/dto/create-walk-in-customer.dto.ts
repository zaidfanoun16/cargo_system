import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { IsInternationalPhoneNumber } from '../../common/phone/phone-number';

// A customer who comes to the office without an account. The staff
// create it; the customer sets a password later with "forgot password".
export class CreateWalkInCustomerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(150)
  email: string;

  @IsInternationalPhoneNumber()
  phoneNumber: string;
}
