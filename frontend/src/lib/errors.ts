import { ApiError } from './api'

// Backend messages (English) → translation keys, so every error is
// shown in the chosen language
const knownErrors: Record<string, string> = {
  'Invalid email or password': 'errors.invalidCredentials',
  'Please verify your email before logging in': 'errors.notVerified',
  'Email is already registered': 'errors.emailTaken',
  'Phone number is already registered': 'errors.phoneTaken',
  'Invalid or expired verification code': 'errors.invalidCode',
  'Invalid or expired reset code': 'errors.invalidCode',
  'Too many wrong attempts, please request a new code': 'errors.tooManyAttempts',
  'Email is already verified': 'errors.alreadyVerified',
  'Invalid email': 'errors.emailNotFound',
  'Reservation dates cannot be in the past': 'errors.pastDates',
  'End date must be after start date': 'errors.endBeforeStart',
  'A reservation must be at least 2 hours': 'errors.minHours',
  'Start and end times must be on the hour (minutes and seconds must be 0)': 'errors.onTheHour',
  'Car is already reserved for the selected dates': 'booking.unavailable.reserved',
  'Car is currently under maintenance': 'booking.unavailable.maintenance',
  'Car is inactive and cannot be reserved': 'booking.unavailable.inactive',
  'Car not found': 'car.notFound',
}

export function errorKey(error: unknown): string {
  if (!(error instanceof ApiError)) return 'errors.generic'
  if (error.status === 0) return 'errors.network'
  if (error.status === 429) return 'errors.tooManyRequests'

  for (const message of error.messages) {
    if (knownErrors[message]) return knownErrors[message]
    if (message.startsWith('phoneNumber')) return 'errors.invalidPhone'
  }

  return 'errors.generic'
}
