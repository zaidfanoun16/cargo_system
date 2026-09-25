// Prices are in Israeli shekels (₪)
export function formatPrice(amount: number, language: string) {
  return new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 2,
  }).format(amount)
}
