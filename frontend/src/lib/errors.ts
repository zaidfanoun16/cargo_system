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
  'Reservation cannot be cancelled after the start date': 'bookings.errors.started',
  'Only PENDING or CONFIRMED reservations can be cancelled': 'bookings.errors.notCancellable',
  'Only completed reservations can be reviewed': 'reviews.errors.notCompleted',
  'This reservation was already reviewed': 'reviews.errors.already',
  'Current password is incorrect': 'errors.currentPasswordWrong',
  'Password is incorrect': 'errors.currentPasswordWrong',
  'New email must be different from the current email': 'errors.sameEmail',
  'Email is already in use': 'errors.emailTaken',
  'No email change was requested': 'errors.noEmailChange',
  'Cannot delete car because it has reservations. Set its status to INACTIVE instead.': 'admin.errors.carHasBookings',
  'Cannot delete category because it contains cars.': 'admin.errors.categoryHasCars',
  'Cannot delete user because they have reservations.': 'admin.errors.userHasBookings',
  'You cannot change your own role': 'admin.errors.ownRole',
  'licensePlate already exists': 'admin.errors.plateTaken',
  'name already exists': 'admin.errors.nameTaken',
  'nameAr already exists': 'admin.errors.nameArTaken',
  'Only PENDING reservations can be confirmed': 'admin.errors.notPending',
  'Only CONFIRMED reservations can be picked up': 'admin.errors.notConfirmed',
  'Only PICKED_UP reservations can be completed': 'admin.errors.notPickedUp',
  'It is too early to hand over this car': 'admin.errors.tooEarly',
  'Invalid handover code': 'handover.errors.invalid',
  'This car was already handed over': 'handover.errors.already',
  'This car was already returned': 'handover.errors.alreadyReturned',
  'This car has not been handed over yet': 'handover.errors.notHandedOver',
  'You already said you are running late': 'bookings.errors.alreadyLate',
  'The pickup time has already passed': 'bookings.errors.pickupPassed',
  'Only CONFIRMED reservations can be marked as running late': 'bookings.errors.pickupPassed',
  'The car was booked by someone else after the no-show': 'handover.errors.carTaken',
  'This reservation has already ended': 'admin.errors.ended',
  'It is too late to cancel this reservation online. Please contact us': 'bookings.errors.tooLate',
  'Your account cannot make new reservations. Please contact us': 'booking.blocked',
}

export function errorKey(error: unknown): string {
  if (!(error instanceof ApiError)) return 'errors.generic'
  if (error.status === 0) return 'errors.network'
  if (error.status === 429) return 'errors.tooManyRequests'

  for (const message of error.messages) {
    if (knownErrors[message]) return knownErrors[message]
    if (message.startsWith('phoneNumber')) return 'errors.invalidPhone'
    if (message.startsWith('A car can have at most')) return 'admin.images.limitReached'
  }

  return 'errors.generic'
}
