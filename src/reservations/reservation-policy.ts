import { ReservationStatus } from './enums/reservation-status.enum';


// Rules that stop people from booking cars they will not use.
// Change the numbers here to change the policy everywhere
// (the frontend and the emails read them from the API).

// A CONFIRMED reservation can be cancelled for free until this many
// hours before pickup
export const FREE_CANCELLATION_HOURS = 24;

// After this point (hours before pickup) a CONFIRMED reservation can no
// longer be cancelled online. Cancelling between the two limits is
// allowed but counts as a late cancellation.
export const CANCELLATION_CUTOFF_HOURS = 2;

// A CONFIRMED reservation whose car was not picked up this many hours
// after the pickup time becomes NO_SHOW
export const NO_SHOW_GRACE_HOURS = 1;

// The car can be handed over this many hours before the pickup time
export const EARLY_PICKUP_HOURS = 1;

// A user who reaches either limit within STRIKE_WINDOW_DAYS cannot make
// new reservations until an admin allows it again
export const MAX_LATE_CANCELLATIONS = 3;
export const MAX_NO_SHOWS = 2;
export const STRIKE_WINDOW_DAYS = 90;


// Reservations that hold the car, so nobody else can book it
export const ACTIVE_STATUSES = [
  ReservationStatus.PENDING,
  ReservationStatus.CONFIRMED,
  ReservationStatus.PICKED_UP,
];


const HOUR_IN_MS = 60 * 60 * 1000;


// Until when a reservation can be cancelled, and until when for free.
// A PENDING reservation can be cancelled for free until pickup.
// Null when it cannot be cancelled any more by its status.
export function cancellationWindow(reservation: {
  status: ReservationStatus;
  startDate: Date;
}) {

  const start = new Date(reservation.startDate).getTime();

  if (reservation.status === ReservationStatus.PENDING) {
    return {
      freeUntil: new Date(start),
      until: new Date(start),
    };
  }

  if (reservation.status === ReservationStatus.CONFIRMED) {
    return {
      freeUntil: new Date(start - FREE_CANCELLATION_HOURS * HOUR_IN_MS),
      until: new Date(start - CANCELLATION_CUTOFF_HOURS * HOUR_IN_MS),
    };
  }

  return null;

}


// The numbers above, for the frontend
export const POLICY = {
  freeCancellationHours: FREE_CANCELLATION_HOURS,
  cancellationCutoffHours: CANCELLATION_CUTOFF_HOURS,
  noShowGraceHours: NO_SHOW_GRACE_HOURS,
  maxLateCancellations: MAX_LATE_CANCELLATIONS,
  maxNoShows: MAX_NO_SHOWS,
  strikeWindowDays: STRIKE_WINDOW_DAYS,
};
