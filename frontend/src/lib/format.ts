// Prices are in Israeli shekels (₪). Whole amounts show no decimals
// (₪200), others show two (₪209.98).
export function formatPrice(amount: number, language: string) {
  const whole = Number.isInteger(amount)

  return new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Plain numbers (years, counts) in the chosen language's digits
export function formatNumber(value: number, language: string) {
  return value.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { useGrouping: false })
}
