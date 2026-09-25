import { PartialType, PickType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

// Password has its own endpoint (PATCH /users/profile/password) because
// changing it requires the current password
export class UpdateUserDto extends PartialType(
  PickType(CreateUserDto, ['fullName', 'email'] as const),
) {}
