// Shapes of the cars API responses, and helpers to show them in the
// chosen language (Arabic names fall back to English when empty)

export type Category = {
  id: number
  name: string
  nameAr: string | null
  description: string | null
  descriptionAr: string | null
}

export type CarImage = {
  id: number
  url: string
}

export type Car = {
  id: number
  brand: string
  brandAr: string | null
  model: string
  modelAr: string | null
  year: number
  color: string
  colorAr: string | null
  pricePerDay: number
  pricePerHour: number | null
  status: 'AVAILABLE' | 'MAINTENANCE' | 'INACTIVE'
  category: Category
  images: CarImage[]
  averageRating: number | null
  reviewsCount: number
}

export type CarsPage = {
  data: Car[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type Quote = {
  hours: number
  available: boolean
  unavailableReason: 'maintenance' | 'inactive' | 'reserved' | null
  basePrice: number
  discountPercent: number
  totalPrice: number
  // Once confirmed, the booking can be cancelled for free until then
  freeCancellationUntil: string
  policy: BookingPolicy
}

// The cancellation and no-show rules (numbers come from the server)
export type BookingPolicy = {
  freeCancellationHours: number
  cancellationCutoffHours: number
  noShowGraceHours: number
  runningLateExtraHours: number
  maxLateCancellations: number
  maxNoShows: number
  strikeWindowDays: number
}

export type Availability = {
  month: string
  carStatus: Car['status']
  // Periods the car is booked, to show free and booked hours
  bookedPeriods: { startDate: string; endDate: string }[]
  bookedDates: string[]
}

export type Review = {
  id: number
  rating: number
  comment: string | null
  reviewer: string
  createdAt: string
}

export type CarReviews = {
  averageRating: number | null
  reviewsCount: number
  reviews: Review[]
}

const isArabic = (language: string) => language.startsWith('ar')

export function carName(car: Pick<Car, 'brand' | 'brandAr' | 'model' | 'modelAr'>, language: string) {
  return isArabic(language)
    ? `${car.brandAr || car.brand} ${car.modelAr || car.model}`
    : `${car.brand} ${car.model}`
}

export function categoryName(category: Category, language: string) {
  return isArabic(language) ? category.nameAr || category.name : category.name
}

export function categoryDescription(category: Category, language: string) {
  return isArabic(language) ? category.descriptionAr || category.description : category.description
}

export function colorName(car: Pick<Car, 'color' | 'colorAr'>, language: string) {
  return isArabic(language) ? car.colorAr || car.color : car.color
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'PICKED_UP' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'

export type Booking = {
  id: number
  startDate: string
  endDate: string
  status: BookingStatus
  basePrice: number
  discountPercent: number
  totalPrice: number
  createdAt: string
  lateCancellation: boolean
  // Shown (as a QR code) to pick up the car; only while CONFIRMED
  handoverCode: string | null
  // The customer said they are running late (once per booking)
  runningLate: boolean
  // Until when the car is kept for the customer; only while CONFIRMED
  pickupDeadline: string | null
  pickedUpAt: string | null
  returnedAt: string | null
  reviewed: boolean
  // Until when it can be cancelled online, and until when for free;
  // null when its status does not allow cancelling
  cancellation: { freeUntil: string; until: string } | null
  car: Omit<Car, 'averageRating' | 'reviewsCount'>
}
