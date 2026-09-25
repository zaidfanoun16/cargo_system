import { MessageCircle, Search, ShieldCheck, ShieldOff, Trash2, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FormAlert } from '../../components/form/FormAlert'
import { Avatar } from '../../components/layout/UserMenu'
import { useAuth } from '../../hooks/useAuth'
import { useConfirm } from '../../hooks/useConfirm'
import { useFetch } from '../../hooks/useFetch'
import { useToast } from '../../hooks/useToast'
import { type AdminUser, whatsappLink } from '../../lib/admin'
import { api } from '../../lib/api'
import { formatDate } from '../../lib/dates'
import { errorKey } from '../../lib/errors'
import { formatNumber } from '../../lib/format'
import { AdminHeader } from './AdminLayout'

export function AdminUsersPage() {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const { user: me } = useAuth()
  const confirm = useConfirm()
  const toast = useToast()
  const users = useFetch<AdminUser[]>('/users', { auth: true })
  const [search, setSearch] = useState('')

  const query = search.trim().toLowerCase()
  const list = [...(users.data ?? [])]
    // Newest accounts first
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((user) => !query || [user.fullName, user.email, user.phoneNumber ?? ''].some((value) => value.toLowerCase().includes(query)))

  async function setRole(user: AdminUser, role: AdminUser['role']) {
    const confirmed = await confirm({
      title: t(role === 'ADMIN' ? 'admin.users.makeAdminTitle' : 'admin.users.removeAdminTitle'),
      message: t(role === 'ADMIN' ? 'admin.users.makeAdminText' : 'admin.users.removeAdminText', { name: user.fullName }),
      confirmLabel: t(role === 'ADMIN' ? 'admin.users.makeAdmin' : 'admin.users.removeAdmin'),
      tone: role === 'ADMIN' ? 'default' : 'danger',
    })
    if (!confirmed) return

    try {
      await api(`/users/${user.id}/role`, { method: 'PATCH', auth: true, body: { role } })
      toast.success(t('admin.users.roleChanged', { name: user.fullName }))
      users.reload()
    } catch (caught) {
      toast.error(t(errorKey(caught)))
    }
  }

  async function remove(user: AdminUser) {
    const confirmed = await confirm({
      title: t('admin.users.deleteTitle'),
      message: t('admin.users.deleteText', { name: user.fullName }),
      confirmLabel: t('admin.delete'),
      tone: 'danger',
    })
    if (!confirmed) return

    try {
      await api(`/users/${user.id}`, { method: 'DELETE', auth: true })
      toast.success(t('admin.users.deleted', { name: user.fullName }))
      users.reload()
    } catch (caught) {
      toast.error(t(errorKey(caught)))
    }
  }

  return (
    <>
      <AdminHeader
        title={t('admin.nav.users')}
        subtitle={
          users.data &&
          t('admin.users.subtitle', {
            count: users.data.length,
            formatted: formatNumber(users.data.length, language),
          })
        }
      />

      <label className="relative block sm:max-w-sm">
        <span className="sr-only">{t('admin.users.search')}</span>
        <Search className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('admin.users.search')}
          className="h-11 w-full rounded-xl border border-border bg-surface ps-10 pe-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </label>

      <div className="mt-6">
        {users.error && !users.data ? (
          <FormAlert type="error">{t(errorKey(users.error))}</FormAlert>
        ) : !users.data ? (
          <div className="h-64 animate-pulse rounded-3xl bg-surface-muted" aria-hidden />
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border border-dashed border-border py-14 text-center">
            <UserRound className="size-8 text-muted" aria-hidden />
            <p className="mt-3 font-bold">{t('admin.users.empty')}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-surface">
            {list.map((user) => {
              const isMe = user.id === me?.id
              return (
                <li key={user.id} className="flex flex-wrap items-center gap-3 p-4">
                  <Avatar name={user.fullName} className="size-10 text-sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold">{user.fullName}</p>
                      {user.role === 'ADMIN' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold">
                          <ShieldCheck className="size-3.5" aria-hidden />
                          {t('account.admin')}
                        </span>
                      )}
                      {isMe && <span className="rounded-full border border-border px-2 py-0.5 text-xs font-semibold text-muted">{t('admin.users.you')}</span>}
                      {!user.isEmailVerified && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                          {t('admin.users.unverified')}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted">
                      <span dir="ltr">{user.email}</span> · {t('account.memberSinceDate', { date: formatDate(user.createdAt, language) })}
                    </p>
                    {user.phoneNumber && (
                      <a
                        href={whatsappLink(user.phoneNumber)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-0.5 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline dark:text-emerald-400"
                      >
                        <MessageCircle className="size-3.5" aria-hidden />
                        <span dir="ltr">{user.phoneNumber}</span>
                      </a>
                    )}
                  </div>

                  {/* Your own role and account are managed elsewhere */}
                  {!isMe && (
                    <div className="flex shrink-0 gap-1">
                      {user.role === 'ADMIN' ? (
                        <button
                          type="button"
                          onClick={() => setRole(user, 'USER')}
                          className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-muted hover:bg-surface-muted hover:text-text"
                        >
                          <ShieldOff className="size-4" aria-hidden />
                          <span className="max-sm:sr-only">{t('admin.users.removeAdmin')}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setRole(user, 'ADMIN')}
                          className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-muted hover:bg-surface-muted hover:text-text"
                        >
                          <ShieldCheck className="size-4" aria-hidden />
                          <span className="max-sm:sr-only">{t('admin.users.makeAdmin')}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => remove(user)}
                        className="grid size-10 place-items-center rounded-xl text-muted hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                        aria-label={t('admin.deleteItem', { name: user.fullName })}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}
