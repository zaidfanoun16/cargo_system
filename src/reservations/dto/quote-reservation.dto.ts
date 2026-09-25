import { Type } from 'class-transformer';
import { IsDateString, IsInt, Min } from 'class-validator';

// Query string of GET /reservations/quote
export class QuoteReservationDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  carId: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
