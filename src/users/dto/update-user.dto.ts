import { PartialType, PickType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

// Password and email have their own endpoints because changing them
// requires the current password (and a code for the new email)
export class UpdateUserDto extends PartialType(
  PickType(CreateUserDto, ['fullName', 'phoneNumber'] as const),
) {}
