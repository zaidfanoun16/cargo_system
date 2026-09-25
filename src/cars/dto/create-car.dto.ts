import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { CarStatus } from '../enums/car-status.enum';
import { IsPositive } from 'class-validator';
export class CreateCarDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  brand: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model: string;

  // Arabic names, e.g. تويوتا / كورولا
  @IsOptional()
  @IsString()
  @MaxLength(100)
  brandAr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelAr?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  licensePlate: string;

  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year: number;

  @IsNumber()
  @IsPositive()
  pricePerDay: number;

  // Optional: without it the car can only be rented by the day
  @IsOptional()
  @IsNumber()
  @IsPositive()
  pricePerHour?: number;

  @IsOptional()
  @IsEnum(CarStatus)
  status?: CarStatus;

  @IsInt()
  @Min(1)
  categoryId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  color: string;

  // Arabic color, e.g. أبيض
  @IsOptional()
  @IsString()
  @MaxLength(100)
  colorAr?: string;
}
