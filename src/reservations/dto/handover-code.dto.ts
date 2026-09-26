import { Matches } from 'class-validator';

// The 6-digit code the customer shows (as a QR code) at pickup
export class HandoverCodeDto {
  @Matches(/^\d{6}$/, { message: 'Invalid handover code' })
  code: string;
}
