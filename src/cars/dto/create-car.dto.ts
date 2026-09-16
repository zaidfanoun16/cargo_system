import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCarDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  brand: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model: string;

  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  pricePerDay: number;

  @IsString()
  @IsNotEmpty()
  @IsIn(['AVAILABLE', 'RENTED', 'MAINTENANCE'])
  status: string;

  @IsInt()
  @Min(1)
  categoryId: number;
}