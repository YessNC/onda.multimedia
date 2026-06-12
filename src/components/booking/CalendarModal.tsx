import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Clock, Loader2, LogIn, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../../hooks/useI18n'
import {
  getPublicAvailabilityPreview,
  type PublicAvailabilityPreviewSlot,
} from '../../lib/dashboard'

interface CalendarModalProps {
  open: boolean
  onClose: () => void
}

interface AvailabilityDateGroup {
  dateKey: string
  label: string
  slots: PublicAvailabilityPreviewSlot[]
}

function dateFromKey(dateKey: string) {
  const [year = '0', month = '1', day = '1'] = dateKey.split('-')
  return new Date(Number(year), Number(month) - 1, Number(day), 12)
}

function getResourceLabel(slot: PublicAvailabilityPreviewSlot, fallback: string) {
  return [slot.studio_name, slot.producer_name].filter(Boolean).join(' / ') || fallback
}

export default function CalendarModal({
  open,
  onClose,
}: CalendarModalProps) {
  const navigate = useNavigate()
  const { language, t } = useI18n()
  const [slots, setSlots] = useState<PublicAvailabilityPreviewSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'es-CL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
    [language],
  )

  const availabilityGroups = useMemo<AvailabilityDateGroup[]>(() => {
    const groups = new Map<string, AvailabilityDateGroup>()

    for (const slot of slots) {
      const currentGroup = groups.get(slot.booking_date)

      if (currentGroup) {
        currentGroup.slots.push(slot)
      } else {
        groups.set(slot.booking_date, {
          dateKey: slot.booking_date,
          label: dateFormatter.format(dateFromKey(slot.booking_date)),
          slots: [slot],
        })
      }
    }

    return [...groups.values()]
  }, [dateFormatter, slots])

  useEffect(() => {
    if (!open) return undefined

    let active = true

    setLoading(true)
    setError(null)

    getPublicAvailabilityPreview({ days: 21, limit: 80 })
      .then((previewSlots) => {
        if (!active) return
        setSlots(previewSlots)
      })
      .catch((previewError) => {
        if (!active) return
        setSlots([])
        setError(previewError instanceof Error ? previewError.message : 'calendarModal.error')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <section
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-white/10 bg-zinc-950 text-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-6">
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-onda-lavender">
              {t('calendarModal.eyebrow')}
            </p>
            <h2 className="mt-2 font-display text-xl font-bold uppercase tracking-[0.08em]">
              {t('calendarModal.title')}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-onda-muted">
              {t('calendarModal.note')}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t('calendarModal.close')}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/10 text-onda-muted transition hover:border-onda-lavender/45 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {loading ? (
            <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-onda-lavender/25 text-sm font-semibold text-onda-muted">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-onda-lavender" aria-hidden="true" />
              {t('calendarModal.loading')}
            </div>
          ) : error ? (
            <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-5 text-sm leading-7 text-amber-100">
              {t('calendarModal.error')}
            </div>
          ) : availabilityGroups.length === 0 ? (
            <div className="rounded-lg border border-dashed border-onda-lavender/25 p-5 text-sm leading-7 text-onda-muted">
              {t('calendarModal.empty')}
            </div>
          ) : (
            <div className="grid gap-4">
              {availabilityGroups.map((group) => (
                <article
                  key={group.dateKey}
                  className="rounded-lg border border-onda-lavender/18 bg-white/[0.04] p-4"
                >
                  <div className="mb-4 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-onda-lavender" aria-hidden="true" />
                    <h3 className="font-display text-sm font-bold uppercase tracking-[0.12em]">
                      {group.label}
                    </h3>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {group.slots.map((slot) => (
                      <div
                        key={`${slot.booking_date}-${slot.start_time}-${slot.service_id}-${slot.studio_id ?? 'no-studio'}-${slot.producer_id ?? 'no-producer'}`}
                        className="rounded-md border border-white/10 bg-zinc-900/85 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-display text-sm font-bold uppercase tracking-[0.08em]">
                              {slot.service_name}
                            </p>
                            <p className="mt-2 text-sm text-onda-muted">
                              {getResourceLabel(slot, t('calendarModal.noResource'))}
                            </p>
                          </div>
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-onda-lavender/25 px-2.5 py-1 text-xs font-bold text-onda-lavender">
                            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                            {slot.start_time}
                          </span>
                        </div>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-onda-muted">
                          {slot.start_time} - {slot.end_time}
                        </p>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <footer className="flex shrink-0 flex-col gap-3 border-t border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-onda-muted">
            {t('calendarModal.footer')}
          </p>
          <button
            type="button"
            onClick={() => navigate('/login?redirect=/dashboard')}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-onda-purple px-4 py-3 font-display text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:-translate-y-0.5 hover:bg-onda-electric"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            {t('calendarModal.cta')}
          </button>
        </footer>
      </section>
    </div>
  )
}
