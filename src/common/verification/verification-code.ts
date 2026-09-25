import { createHash, randomInt, timingSafeEqual } from 'crypto';

// How long a verification code stays valid
export const VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000;

// Wrong attempts allowed before the user must request a new code
export const MAX_VERIFICATION_ATTEMPTS = 5;

// Fields on the user that hold a pending verification code
export type VerificationCodeHolder = {
  emailVerificationToken: string | null;
  emailVerificationExpiresAt: Date | null;
  emailVerificationAttempts: number;
};

export function hashVerificationCode(code: string) {
  return createHash('sha256').update(code).digest('hex');
}

// Generate a new 6-digit code and store only its hash on the holder.
// Returns the plain code so it can be emailed.
export function setVerificationCode(holder: VerificationCodeHolder) {
  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');

  holder.emailVerificationToken = hashVerificationCode(code);
  holder.emailVerificationExpiresAt = new Date(
    Date.now() + VERIFICATION_CODE_TTL_MS,
  );
  holder.emailVerificationAttempts = 0;

  return code;
}

export function clearVerificationCode(holder: VerificationCodeHolder) {
  holder.emailVerificationToken = null;
  holder.emailVerificationExpiresAt = null;
  holder.emailVerificationAttempts = 0;
}

export type VerificationCodeCheck =
  | 'valid'
  | 'missing'
  | 'expired'
  | 'too-many-attempts'
  | 'wrong';

// Check a submitted code. A wrong code increments the attempts counter,
// so the caller must save the holder afterwards.
export function checkVerificationCode(
  holder: VerificationCodeHolder,
  code: string,
): VerificationCodeCheck {
  if (!holder.emailVerificationToken) {
    return 'missing';
  }

  if (
    !holder.emailVerificationExpiresAt ||
    holder.emailVerificationExpiresAt < new Date()
  ) {
    return 'expired';
  }

  if (holder.emailVerificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
    return 'too-many-attempts';
  }

  // Compare hashes in constant time
  const isValid = timingSafeEqual(
    Buffer.from(hashVerificationCode(code)),
    Buffer.from(holder.emailVerificationToken),
  );

  if (!isValid) {
    holder.emailVerificationAttempts += 1;
    return 'wrong';
  }

  return 'valid';
}
