import { PartialType } from '@nestjs/mapped-types';

import { CreateCarDto } from './create-car.dto';

// All fields become optional when updating a car
export class UpdateCarDto extends PartialType(CreateCarDto) {}
