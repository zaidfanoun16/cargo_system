import { IsDateString, IsInt } from 'class-validator';

export class CreateReservationDto {
  @IsInt()
  carId: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
