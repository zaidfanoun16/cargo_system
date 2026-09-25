import { CalendarDays, ChevronLeft, Heart, Mail, Phone, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Avatar } from '../../components/layout/UserMenu'
import { Container } from '../../components/ui/Container'
import { useAuth } from '../../hooks/useAuth'
import { useFetch } from '../../hooks/useFetch'
import { formatDate } from '../../lib/dates'
import { EmailForm } from './EmailForm'
import { PasswordForm } from './PasswordForm'
import { PersonalInfoForm } from './PersonalInfoForm'

export function AccountPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  // For the "member since" date, which the session does not keep
  const profile = useFetch<{ createdAt: string }>('/users/profile', { auth: true })

  // RequireAuth guarantees a user; this keeps TypeScript sure of it
  if (!user) return null

  const shortcuts = [
    { to: '/my-bookings', key: 'nav.myBookings', icon: CalendarDays },
    { to: '/favorites', key: 'nav.favorites', icon: Heart },
  ] as const

  return (
    <Container className="py-8 sm:py-12">
      <h1 className="text-3xl font-extrabold sm:text-4xl">{t('nav.account')}</h1>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4 lg:sticky lg:top-20">
          <div className="rounded-3xl border border-border bg-surface p-6 text-center">
            <Avatar name={user.fullName} className="mx-auto size-20 text-3xl" />
            <p className="mt-4 text-xl font-extrabold">{user.fullName}</p>
            {user.role === 'ADMIN' && (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1 text-xs font-bold">
                <ShieldCheck className="size-3.5" aria-hidden />
                {t('account.admin')}
              </span>
            )}
            <dl className="mt-5 space-y-2.5 text-start text-sm">
              <div className="flex items-center gap-2.5">
                <dt>
                  <Mail className="size-4 text-muted" aria-label={t('auth.email')} />
                </dt>
                <dd className="truncate" dir="ltr">
                  {user.email}
                </dd>
              </div>
              {user.phoneNumber && (
                <div className="flex items-center gap-2.5">
                  <dt>
                    <Phone className="size-4 text-muted" aria-label={t('auth.phone')} />
                  </dt>
                  <dd dir="ltr">{user.phoneNumber}</dd>
                </div>
              )}
              {profile.data && (
                <div className="flex items-center gap-2.5">
                  <dt>
                    <CalendarDays className="size-4 text-muted" aria-label={t('account.memberSince')} />
                  </dt>
                  <dd className="text-muted">
                    {t('account.memberSinceDate', {
                      date: formatDate(profile.data.createdAt, i18n.language, { day: undefined }),
                    })}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <nav className="overflow-hidden rounded-3xl border border-border bg-surface" aria-label={t('nav.account')}>
            {shortcuts.map(({ to, key, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 border-b border-border px-5 py-4 text-sm font-semibold last:border-0 hover:bg-surface-muted"
              >
                <Icon className="size-5 text-muted" aria-hidden />
                <span className="flex-1">{t(key)}</span>
                <ChevronLeft className="size-4 text-muted ltr:rotate-180" aria-hidden />
              </Link>
            ))}
          </nav>
        </aside>

        <div className="space-y-6">
          {/* key: refill the form if the profile changes elsewhere */}
          <PersonalInfoForm key={`${user.fullName}|${user.phoneNumber}`} user={user} />
          <EmailForm user={user} />
          <PasswordForm user={user} />
        </div>
      </div>
    </Container>
  )
}
