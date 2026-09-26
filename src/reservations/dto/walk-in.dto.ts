import { Type } from 'class-transformer';
import { IsDateString, IsInt, Min } from 'class-validator';

// A rental that starts now, at the office (price check)
export class WalkInQuoteDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  carId: number;

  @IsDateString()
  endDate: string;
}

// A rental that starts now, at the office, for this customer
export class WalkInReservationDto extends WalkInQuoteDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId: number;
}
