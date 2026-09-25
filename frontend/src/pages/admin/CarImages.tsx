import { ImagePlus, Trash2 } from 'lucide-react'
import { type ChangeEvent, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useConfirm } from '../../hooks/useConfirm'
import { useToast } from '../../hooks/useToast'
import { api } from '../../lib/api'
import type { CarImage } from '../../lib/cars'
import { errorKey } from '../../lib/errors'
import { formatNumber } from '../../lib/format'

// Same limits as the server, checked first so mistakes show at once
const MAX_IMAGES = 10
const MAX_PER_UPLOAD = 5
const MAX_SIZE = 5 * 1024 * 1024
const TYPES = ['image/jpeg', 'image/png', 'image/webp']

type Props = { carId: number; images: CarImage[]; onChange: () => void }

export function CarImages({ carId, images, onChange }: Props) {
  const { t, i18n } = useTranslation()
  const confirm = useConfirm()
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    if (files.length === 0) return

    if (files.some((file) => !TYPES.includes(file.type))) return toast.error(t('admin.images.wrongType'))
    if (files.some((file) => file.size > MAX_SIZE)) return toast.error(t('admin.images.tooBig'))
    if (files.length > MAX_PER_UPLOAD) return toast.error(t('admin.images.tooManyAtOnce', { count: MAX_PER_UPLOAD }))
    if (images.length + files.length > MAX_IMAGES) return toast.error(t('admin.images.tooMany', { count: MAX_IMAGES }))

    const form = new FormData()
    files.forEach((file) => form.append('images', file))

    setUploading(true)
    try {
      await api(`/cars/${carId}/images`, { method: 'POST', auth: true, body: form })
      toast.success(t('admin.images.uploaded', { count: files.length }))
      onChange()
    } catch (caught) {
      toast.error(t(errorKey(caught)))
    } finally {
      setUploading(false)
    }
  }

  async function remove(image: CarImage, index: number) {
    const confirmed = await confirm({
      title: t('admin.images.deleteTitle'),
      message: t('admin.images.deleteText', { number: formatNumber(index + 1, i18n.language) }),
      confirmLabel: t('admin.delete'),
      tone: 'danger',
    })
    if (!confirmed) return

    try {
      await api(`/cars/${carId}/images/${image.id}`, { method: 'DELETE', auth: true })
      toast.success(t('admin.images.deleted'))
      onChange()
    } catch (caught) {
      toast.error(t(errorKey(caught)))
    }
  }

  return (
    <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-extrabold">{t('admin.images.title')}</h2>
          <p className="mt-0.5 text-xs text-muted">
            {t('admin.images.hint', { count: formatNumber(images.length, i18n.language), max: formatNumber(MAX_IMAGES, i18n.language) })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={uploading || images.length >= MAX_IMAGES}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3.5 text-sm font-semibold hover:bg-surface-muted disabled:opacity-50"
        >
          <ImagePlus className="size-4" aria-hidden />
          {uploading ? t('admin.images.uploading') : t('admin.images.add')}
        </button>
        <input ref={input} type="file" accept={TYPES.join(',')} multiple hidden onChange={upload} />
      </div>

      {images.length === 0 ? (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="mt-4 flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border py-10 text-sm font-semibold text-muted hover:border-primary/40 hover:text-text"
        >
          <ImagePlus className="size-7" aria-hidden />
          {t('admin.images.empty')}
        </button>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {images.map((image, index) => (
            <li key={image.id} className="group relative overflow-hidden rounded-2xl border border-border">
              <img src={image.url} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
              {index === 0 && (
                <span className="absolute start-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white">
                  {t('admin.images.cover')}
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(image, index)}
                className="absolute end-2 top-2 grid size-9 place-items-center rounded-full bg-white/90 text-red-700 shadow hover:bg-white"
                aria-label={t('admin.images.deleteNumber', { number: index + 1 })}
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
