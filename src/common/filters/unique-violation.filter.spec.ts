import { ArgumentsHost, ConflictException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { QueryFailedError } from 'typeorm';

import { UniqueViolationFilter } from './unique-violation.filter';

describe('UniqueViolationFilter', () => {
  const host = {} as ArgumentsHost;
  let passedOn: jest.SpyInstance;

  beforeEach(() => {
    passedOn = jest
      .spyOn(BaseExceptionFilter.prototype, 'catch')
      .mockImplementation(() => undefined);
  });

  afterEach(() => passedOn.mockRestore());

  const dbError = (driverError: object) =>
    new QueryFailedError(
      'INSERT ...',
      [],
      Object.assign(new Error('db'), driverError),
    );

  it('turns a duplicate value into 409 naming the column', () => {
    new UniqueViolationFilter().catch(
      dbError({
        code: '23505',
        detail: 'Key ("licensePlate")=(AB-123) already exists.',
      }),
      host,
    );

    const sent = passedOn.mock.calls[0][0];
    expect(sent).toBeInstanceOf(ConflictException);
    expect(sent.message).toBe('licensePlate already exists');
  });

  it('leaves other database errors unchanged', () => {
    const error = dbError({ code: '23503' });

    new UniqueViolationFilter().catch(error, host);

    expect(passedOn.mock.calls[0][0]).toBe(error);
  });
});
