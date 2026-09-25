import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { QueryFailedError } from 'typeorm';

// PostgreSQL's code for "duplicate key value violates unique constraint"
const UNIQUE_VIOLATION = '23505';

// A duplicate value in a unique column (a car's license plate, a category
// name...) is the client's mistake, so it becomes 409 "licensePlate
// already exists" instead of a 500. Other database errors are unchanged.
@Catch(QueryFailedError)
export class UniqueViolationFilter
  extends BaseExceptionFilter
  implements ExceptionFilter
{
  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const driverError = exception.driverError as {
      code?: string;
      detail?: string;
    };

    if (driverError?.code !== UNIQUE_VIOLATION) {
      return super.catch(exception, host);
    }

    // detail looks like: Key ("licensePlate")=(AB-123) already exists.
    const column = driverError.detail?.match(/Key \("?([^")]+)"?\)=/)?.[1];

    return super.catch(
      new ConflictException(
        column ? `${column} already exists` : 'Value already exists',
      ),
      host,
    );
  }
}
