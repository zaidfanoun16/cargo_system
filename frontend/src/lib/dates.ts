// Dates in forms are the user's local time. The API gets ISO strings.

const DAY_MS = 24 * 60 * 60 * 1000

// "2030-10-01" for a date input
export function toDateInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS)
}

// A local date ("2030-10-01") and hour (10) as one moment
export function atHour(date: string, hour: number) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day, hour)
}

export function isValidDateInput(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(atHour(value, 0).getTime()))
}

// "10:00" in the chosen language (e.g. "١٠:٠٠ ص")
export function formatHour(hour: number, language: string) {
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2000, 0, 1, hour))
}

export function formatDate(date: Date | string, language: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(new Date(date))
}
