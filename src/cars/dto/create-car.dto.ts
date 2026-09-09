import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCarDto {
  // Car brand, for example: Toyota
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  brand: string;

  // Car model, for example: Corolla
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model: string;

  // Manufacturing year
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year: number;

  // Rental price per day
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  pricePerDay: number;

  // Initial car status
  @IsString()
  @IsNotEmpty()
  @IsIn(['AVAILABLE', 'RENTED', 'MAINTENANCE'])
  status: string;
}