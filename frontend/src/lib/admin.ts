import type { BookingStatus, Car } from './cars'

// Shapes of the admin API responses

export type Stats = {
  totals: { users: number; cars: number; reservations: number; revenue: number }
  reservationsByStatus: Record<BookingStatus, number>
  revenueByMonth: { month: string; revenue: number; reservations: number }[]
  topCars: {
    id: number
    brand: string
    brandAr: string | null
    model: string
    modelAr: string | null
    reservations: number
    revenue: number
  }[]
  occupancy: { bookedDays: number; availableDays: number; percentage: number }
}

export type AdminBooking = {
  id: number
  startDate: string
  endDate: string
  status: BookingStatus
  basePrice: number
  discountPercent: number
  totalPrice: number
  createdAt: string
  lateCancellation: boolean
  runningLate: boolean
  pickedUpAt: string | null
  returnedAt: string | null
  user: {
    id: number
    fullName: string
    email: string
    phoneNumber: string | null
    role: string
    bookingBlocked: boolean
    // How reliable the customer has been, over all their bookings
    record: { completed: number; lateCancellations: number; noShows: number }
  }
  car: Pick<Car, 'id' | 'brand' | 'brandAr' | 'model' | 'modelAr'> & { licensePlate: string }
}

export type AdminUser = {
  id: number
  fullName: string
  email: string
  phoneNumber: string | null
  role: 'USER' | 'ADMIN'
  isEmailVerified: boolean
  bookingBlocked: boolean
  createdAt: string
}

export type AdminCar = Car & { licensePlate: string }

// Opens a WhatsApp chat with the number (digits only, with country code)
export function whatsappLink(phoneNumber: string) {
  return `https://wa.me/${phoneNumber.replace(/\D/g, '')}`
}
