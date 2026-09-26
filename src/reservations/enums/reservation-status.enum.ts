export enum ReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  // The customer has the car
  PICKED_UP = 'PICKED_UP',
  CANCELLED = 'CANCELLED',
  // The car was returned
  COMPLETED = 'COMPLETED',
  // The customer never came to pick up the car
  NO_SHOW = 'NO_SHOW',
}
