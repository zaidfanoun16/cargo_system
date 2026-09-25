import { IsOptional, Matches } from 'class-validator';

export class AvailabilityQueryDto {
  // Month to show, e.g. 2030-10. Defaults to the current month.
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'month must be in the format YYYY-MM',
  })
  month?: string;
}
