import { Search } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { Button } from './ui/Button'

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10)
}

// Date search that opens the cars page with the chosen period.
// "glass" is the see-through version shown over a photo.
export function SearchForm({ variant = 'solid' }: { variant?: 'solid' | 'glass' }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const today = new Date()
  const [startDate, setStartDate] = useState(toDateInput(today))
  const [endDate, setEndDate] = useState(
    toDateInput(new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)),
  )

  function search(event: FormEvent) {
    event.preventDefault()
    navigate(`/cars?${new URLSearchParams({ startDate, endDate })}`)
  }

  const glass = variant === 'glass'

  const formClass = glass
    ? 'border-white/20 bg-white/10 text-white shadow-2xl backdrop-blur-md'
    : 'border-border bg-bg shadow-sm'
  const labelClass = glass ? 'text-white/75' : 'text-muted'
  const inputClass = glass
    ? 'border-white/25 bg-white/90 text-neutral-900'
    : 'border-border bg-surface text-text'

  return (
    <form onSubmit={search} className={`rounded-2xl border p-4 ${formClass}`}>
      <p className="mb-3 text-sm font-bold">{t('home.searchTitle')}</p>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className={`flex flex-col gap-1 text-xs font-semibold ${labelClass}`}>
          {t('home.from')}
          <input
            type="date"
            value={startDate}
            min={toDateInput(today)}
            onChange={(event) => setStartDate(event.target.value)}
            className={`h-11 rounded-xl border px-3 text-sm ${inputClass}`}
            required
          />
        </label>
        <label className={`flex flex-col gap-1 text-xs font-semibold ${labelClass}`}>
          {t('home.to')}
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(event) => setEndDate(event.target.value)}
            className={`h-11 rounded-xl border px-3 text-sm ${inputClass}`}
            required
          />
        </label>
        <Button type="submit" variant={glass ? 'light' : 'primary'} className="h-11 self-end">
          <Search className="size-4" aria-hidden />
          {t('home.search')}
        </Button>
      </div>
    </form>
  )
}
