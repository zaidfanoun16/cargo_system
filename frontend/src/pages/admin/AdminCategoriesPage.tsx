import { Pencil, Plus, Tags, Trash2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Field } from '../../components/form/Field'
import { FormAlert } from '../../components/form/FormAlert'
import { Button } from '../../components/ui/Button'
import { useConfirm } from '../../hooks/useConfirm'
import { useFetch } from '../../hooks/useFetch'
import { useToast } from '../../hooks/useToast'
import { api } from '../../lib/api'
import type { Category } from '../../lib/cars'
import { errorKey } from '../../lib/errors'
import { AdminHeader } from './AdminLayout'

type Form = { name: string; nameAr: string; description: string; descriptionAr: string }

const empty: Form = { name: '', nameAr: '', description: '', descriptionAr: '' }

export function AdminCategoriesPage() {
  const { t } = useTranslation()
  const confirm = useConfirm()
  const toast = useToast()
  const categories = useFetch<Category[]>('/car-categories')

  // null: the form is closed; 'new' or a category: adding or editing
  const [editing, setEditing] = useState<Category | 'new' | null>(null)

  async function remove(category: Category) {
    const confirmed = await confirm({
      title: t('admin.categories.deleteTitle'),
      message: t('admin.categories.deleteText', { name: category.nameAr || category.name }),
      confirmLabel: t('admin.delete'),
      tone: 'danger',
    })
    if (!confirmed) return

    try {
      await api(`/car-categories/${category.id}`, { method: 'DELETE', auth: true })
      toast.success(t('admin.categories.deleted'))
      categories.reload()
    } catch (caught) {
      toast.error(t(errorKey(caught)))
    }
  }

  return (
    <>
      <AdminHeader
        title={t('admin.nav.categories')}
        subtitle={t('admin.categories.subtitle')}
        action={
          editing === null && (
            <Button className="h-11" onClick={() => setEditing('new')}>
              <Plus className="size-4" aria-hidden />
              {t('admin.categories.add')}
            </Button>
          )
        }
      />

      {editing !== null && (
        <CategoryForm
          key={editing === 'new' ? 'new' : editing.id}
          category={editing === 'new' ? undefined : editing}
          onDone={(saved) => {
            setEditing(null)
            if (saved) categories.reload()
          }}
        />
      )}

      {categories.error && !categories.data ? (
        <FormAlert type="error">{t(errorKey(categories.error))}</FormAlert>
      ) : !categories.data ? (
        <div className="h-48 animate-pulse rounded-3xl bg-surface-muted" aria-hidden />
      ) : categories.data.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-border py-14 text-center">
          <Tags className="size-8 text-muted" aria-hidden />
          <p className="mt-3 font-bold">{t('admin.categories.empty')}</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {categories.data.map((category) => (
            <li key={category.id} className="flex items-start gap-3 rounded-3xl border border-border bg-surface p-4 sm:p-5">
              <div className="min-w-0 flex-1">
                <p className="font-extrabold">
                  {category.nameAr || '—'} <span className="font-semibold text-muted">· {category.name}</span>
                </p>
                {(category.descriptionAr || category.description) && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{category.descriptionAr || category.description}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => setEditing(category)}
                  className="grid size-10 place-items-center rounded-xl text-muted hover:bg-surface-muted hover:text-text"
                  aria-label={t('admin.editItem', { name: category.name })}
                >
                  <Pencil className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => remove(category)}
                  className="grid size-10 place-items-center rounded-xl text-muted hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                  aria-label={t('admin.deleteItem', { name: category.name })}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function CategoryForm({ category, onDone }: { category?: Category; onDone: (saved: boolean) => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const [form, setForm] = useState<Form>(
    category
      ? {
          name: category.name,
          nameAr: category.nameAr ?? '',
          description: category.description ?? '',
          descriptionAr: category.descriptionAr ?? '',
        }
      : empty,
  )
  const [errors, setErrors] = useState<Partial<Form>>({})
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(undefined)
    if (!form.name.trim()) {
      setErrors({ name: t('errors.required') })
      return
    }

    const optional = (value: string) => value.trim() || null
    const body = {
      name: form.name.trim(),
      nameAr: optional(form.nameAr),
      description: optional(form.description),
      descriptionAr: optional(form.descriptionAr),
    }

    setSaving(true)
    try {
      await api(category ? `/car-categories/${category.id}` : '/car-categories', {
        method: category ? 'PATCH' : 'POST',
        auth: true,
        body,
      })
      toast.success(t(category ? 'admin.categories.saved' : 'admin.categories.created'))
      onDone(true)
    } catch (caught) {
      const key = errorKey(caught)
      if (key === 'admin.errors.nameTaken') setErrors({ name: t(key) })
      else if (key === 'admin.errors.nameArTaken') setErrors({ nameAr: t('admin.errors.nameTaken') })
      else setError(key)
    } finally {
      setSaving(false)
    }
  }

  const update = (field: keyof Form) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  return (
    <form onSubmit={submit} noValidate className="mb-6 rounded-3xl border-2 border-primary/30 bg-surface p-5 sm:p-6">
      <h2 className="font-extrabold">{category ? t('admin.categories.edit') : t('admin.categories.add')}</h2>
      {error && (
        <div className="mt-4">
          <FormAlert type="error">{t(error)}</FormAlert>
        </div>
      )}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label={t('admin.categories.name')} dir="ltr" placeholder="SUV" value={form.name} onChange={(e) => update('name')(e.target.value)} error={errors.name} maxLength={100} />
        <Field label={t('admin.categories.nameAr')} dir="rtl" placeholder="دفع رباعي" value={form.nameAr} onChange={(e) => update('nameAr')(e.target.value)} error={errors.nameAr} maxLength={100} />
        <Field label={t('admin.categories.description')} dir="ltr" value={form.description} onChange={(e) => update('description')(e.target.value)} />
        <Field label={t('admin.categories.descriptionAr')} dir="rtl" value={form.descriptionAr} onChange={(e) => update('descriptionAr')(e.target.value)} />
      </div>
      <div className="mt-5 flex gap-2">
        <Button type="submit" className="h-11" disabled={saving}>
          {saving ? t('auth.loading') : category ? t('account.save') : t('admin.categories.add')}
        </Button>
        <Button type="button" variant="ghost" className="h-11" onClick={() => onDone(false)}>
          {t('confirm.cancel')}
        </Button>
      </div>
    </form>
  )
}
