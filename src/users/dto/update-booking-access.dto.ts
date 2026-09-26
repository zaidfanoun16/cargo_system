import { IsBoolean } from 'class-validator';

export class UpdateBookingAccessDto {
    @IsBoolean()
    blocked: boolean;
}
