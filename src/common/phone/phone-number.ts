import { ValidationOptions, ValidateBy, buildMessage } from 'class-validator';
import { isValidPhoneNumber, parsePhoneNumberWithError } from 'libphonenumber-js';

// WhatsApp numbers are stored in international E.164 format, e.g.
// "+970591234567", so the same number is always stored the same way.
export function normalizePhoneNumber(value: string): string {
  return parsePhoneNumberWithError(value).number;
}

// A real phone number that starts with + and the country code
export function IsInternationalPhoneNumber(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isInternationalPhoneNumber',
      validator: {
        validate: (value) =>
          typeof value === 'string' &&
          value.trim().startsWith('+') &&
          isValidPhoneNumber(value),
        defaultMessage: buildMessage(
          (eachPrefix) =>
            `${eachPrefix}$property must be a valid WhatsApp number with the country code, e.g. +970591234567`,
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
