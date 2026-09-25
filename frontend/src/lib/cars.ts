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
}

export type Availability = {
  month: string
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
