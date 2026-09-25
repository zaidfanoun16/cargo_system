import { Matches } from 'class-validator';

export class ConfirmEmailChangeDto {
  // The 6-digit code sent to the new email
  @Matches(/^\d{6}$/, { message: 'code must be 6 digits' })
  code: string;
}
