import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCarCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)

  // Arabic name and description, e.g. دفع رباعي
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nameAr?: string;

  @IsOptional()
  @IsString()
  descriptionAr?: string;
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}