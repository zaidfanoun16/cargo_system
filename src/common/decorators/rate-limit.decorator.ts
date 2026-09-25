import { Throttle } from '@nestjs/throttler';

// Routes that check a password or a code: slows down guessing
export const StrictRateLimit = () =>
  Throttle({ default: { limit: 5, ttl: 60_000 } });

// Routes that send an email: protects the email quota and users' inboxes
export const EmailRateLimit = () =>
  Throttle({ default: { limit: 3, ttl: 60_000 } });
