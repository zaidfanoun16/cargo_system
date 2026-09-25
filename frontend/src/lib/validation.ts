// The same rules the backend checks, so mistakes show before sending

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export const MIN_PASSWORD_LENGTH = 8

// WhatsApp numbers must start with + and the country code. "00970…" is
// the same as "+970…", and spaces or dashes are removed.
export function normalizePhone(value: string) {
  const compact = value.replace(/[\s\-().]/g, '')
  return compact.startsWith('00') ? `+${compact.slice(2)}` : compact
}

export function isInternationalPhone(value: string) {
  return /^\+[1-9]\d{7,14}$/.test(normalizePhone(value))
}
