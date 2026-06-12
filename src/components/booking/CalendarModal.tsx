import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Loader2, LogIn, SlidersHorizontal, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import OndaSelect, { type OndaSelectOption } from '../shared/OndaSelect'
import AvailabilityCalendar from '../shared/AvailabilityCalendar'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../hooks/useI18n'
import {
  getPublicAvailabilityPreview,
  getStartOfToday,
  minutesFromTime,
  namesLookLikeSameTeamMember,
  normalizeComparableName,
  toDateKey,
  type PublicAvailabilityPreviewSlot,
} from '../../lib/dashboard'
import { cn } from '../../lib/utils'

interface CalendarModalProps {
  open: boolean
  onClose: () => void
}

interface PublicCalendarSelection {
  producerId: string
  serviceId: string
  studioId: string
}

const emptySelection: PublicCalendarSelection = {
  producerId: '',
  serviceId: '',
  studioId: '',
}

function dateFromKey(dateKey: string) {
  const [year = '0', month = '1', day = '1'] = dateKey.split('-')
  return new Date(Number(year), Number(month) - 1, Number(day), 12)
}

function getOptionScore(option: OndaSelectOption) {
  return normalizeComparableName(option.label).split(' ').filter(Boolean).length
}

function sortOptions(options: OndaSelectOption[]) {
  return [...options].sort((left, right) => left.label.localeCompare(right.label))
}

function dedupeNamedOptions(options: OndaSelectOption[]) {
  const orderedOptions = [...options].sort((left, right) => {
    const scoreDelta = getOptionScore(right) - getOptionScore(left)
    return scoreDelta || left.label.localeCompare(right.label)
  })
  const uniqueOptions: OndaSelectOption[] = []

  for (const option of orderedOptions) {
    if (uniqueOptions.some((current) => namesLookLikeSameTeamMember(current.label, option.label))) continue
    uniqueOptions.push(option)
  }

  return sortOptions(uniqueOptions)
}

function collectOptions(
  slots: PublicAvailabilityPreviewSlot[],
  readId: (slot: PublicAvailabilityPreviewSlot) => string | null,
  readLabel: (slot: PublicAvailabilityPreviewSlot) => string | null,
) {
  const optionsById = new Map<string, OndaSelectOption>()

  for (const slot of slots) {
    const value = readId(slot)
    const label = readLabel(slot)

    if (!value || !label || optionsById.has(value)) continue
    optionsById.set(value, { value, label })
  }

  return sortOptions([...optionsById.values()])
}

function getSlotKey(slot: PublicAvailabilityPreviewSlot) {
  return `${slot.start_time}-${slot.end_time}`
}

export default function CalendarModal({
  open,
  onClose,
}: CalendarModalProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { language, t } = useI18n()
  const [slots, setSlots] = useState<PublicAvailabilityPreviewSlot[]>([])
  const [selectedDate, setSelectedDate] = useState(getStartOfToday)
  const [selection, setSelection] = useState<PublicCalendarSelection>(emptySelection)
  const [selectedSlotKey, setSelectedSlotKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedDateKey = toDateKey(selectedDate)

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'es-CL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    [language],
  )

  const serviceChoices = useMemo(
    () => collectOptions(slots, (slot) => slot.service_id, (slot) => slot.service_name),
    [slots],
  )
  const selectedServiceSlots = useMemo(
    () => slots.filter((slot) => slot.service_id === selection.serviceId),
    [selection.serviceId, slots],
  )
  const studioChoices = useMemo(
    () => collectOptions(selectedServiceSlots, (slot) => slot.studio_id, (slot) => slot.studio_name),
    [selectedServiceSlots],
  )
  const hasStudioSelector = studioChoices.length > 0
  const selectedStudioSlots = useMemo(
    () =>
      hasStudioSelector
        ? selectedServiceSlots.filter((slot) => slot.studio_id === selection.studioId)
        : selectedServiceSlots,
    [hasStudioSelector, selectedServiceSlots, selection.studioId],
  )
  const rawProducerChoices = useMemo(
    () => collectOptions(selectedStudioSlots, (slot) => slot.producer_id, (slot) => slot.producer_name),
    [selectedStudioSlots],
  )
  const producerChoices = useMemo(() => dedupeNamedOptions(rawProducerChoices), [rawProducerChoices])
  const hasProducerSelector = producerChoices.length > 0
  const selectedProducerIds = useMemo(() => {
    const selectedProducer = producerChoices.find((producer) => producer.value === selection.producerId)

    if (!selectedProducer) return new Set<string>()

    return new Set(
      rawProducerChoices
        .filter(
          (producer) =>
            producer.value === selectedProducer.value ||
            namesLookLikeSameTeamMember(producer.label, selectedProducer.label),
        )
        .map((producer) => producer.value),
    )
  }, [producerChoices, rawProducerChoices, selection.producerId])
  const filteredSlots = useMemo(
    () =>
      selectedStudioSlots.filter((slot) => {
        if (!hasProducerSelector) return true
        return Boolean(slot.producer_id && selectedProducerIds.has(slot.producer_id))
      }),
    [hasProducerSelector, selectedProducerIds, selectedStudioSlots],
  )
  const availableDateKeyList = useMemo(
    () => [...new Set(filteredSlots.map((slot) => slot.booking_date))].sort(),
    [filteredSlots],
  )
  const availableDateKeys = useMemo(() => new Set(availableDateKeyList), [availableDateKeyList])
  const selectedDaySlots = useMemo(() => {
    const slotsByTime = new Map<string, PublicAvailabilityPreviewSlot>()

    for (const slot of filteredSlots) {
      if (slot.booking_date !== selectedDateKey) continue
      slotsByTime.set(getSlotKey(slot), slot)
    }

    return [...slotsByTime.values()].sort(
      (left, right) => minutesFromTime(left.start_time) - minutesFromTime(right.start_time),
    )
  }, [filteredSlots, selectedDateKey])
  const selectedSlot = selectedDaySlots.find((slot) => getSlotKey(slot) === selectedSlotKey) ?? null
  const serviceOptions = useMemo<OndaSelectOption[]>(
    () => [
      {
        value: '',
        label: serviceChoices.length > 0 ? t('dashboard.select.service') : t('dashboard.select.noServices'),
        disabled: true,
      },
      ...serviceChoices,
    ],
    [serviceChoices, t],
  )
  const studioOptions = useMemo<OndaSelectOption[]>(
    () =>
      hasStudioSelector
        ? [
            {
              value: '',
              label:
                studioChoices.length > 0
                  ? t('dashboard.select.studio')
                  : t('dashboard.calendar.noStudiosForService'),
              disabled: true,
            },
            ...studioChoices,
          ]
        : [{ value: '', label: t('dashboard.notApplicable') }],
    [hasStudioSelector, studioChoices, t],
  )
  const producerOptions = useMemo<OndaSelectOption[]>(
    () =>
      hasProducerSelector
        ? [
            {
              value: '',
              label:
                producerChoices.length > 0
                  ? t('dashboard.select.producer')
                  : t('dashboard.calendar.noProducersForSelection'),
              disabled: true,
            },
            ...producerChoices,
          ]
        : [{ value: '', label: t('dashboard.notApplicable') }],
    [hasProducerSelector, producerChoices, t],
  )

  useEffect(() => {
    if (!open) return undefined

    let active = true

    setLoading(true)
    setError(null)
    setSelectedDate(getStartOfToday())
    setSelectedSlotKey('')

    getPublicAvailabilityPreview({ days: 60, limit: 5000 })
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

  useEffect(() => {
    if (serviceChoices.length === 0) {
      setSelection(emptySelection)
      return
    }

    setSelection((current) => {
      if (serviceChoices.some((service) => service.value === current.serviceId)) return current
      return { producerId: '', serviceId: serviceChoices[0]?.value ?? '', studioId: '' }
    })
  }, [serviceChoices])

  useEffect(() => {
    setSelection((current) => {
      const nextStudioId = hasStudioSelector
        ? studioChoices.some((studio) => studio.value === current.studioId)
          ? current.studioId
          : studioChoices[0]?.value ?? ''
        : ''

      if (current.studioId === nextStudioId) return current
      return { ...current, producerId: '', studioId: nextStudioId }
    })
  }, [hasStudioSelector, studioChoices])

  useEffect(() => {
    setSelection((current) => {
      const nextProducerId = hasProducerSelector
        ? producerChoices.some((producer) => producer.value === current.producerId)
          ? current.producerId
          : producerChoices[0]?.value ?? ''
        : ''

      if (current.producerId === nextProducerId) return current
      return { ...current, producerId: nextProducerId }
    })
  }, [hasProducerSelector, producerChoices])

  useEffect(() => {
    if (availableDateKeyList.length === 0) return
    if (availableDateKeys.has(selectedDateKey)) return

    setSelectedDate(dateFromKey(availableDateKeyList[0] ?? selectedDateKey))
    setSelectedSlotKey('')
  }, [availableDateKeyList, availableDateKeys, selectedDateKey])

  useEffect(() => {
    setSelectedSlotKey('')
  }, [selection.producerId, selection.serviceId, selection.studioId, selectedDateKey])

  function handleServiceChange(serviceId: string) {
    setSelection({ producerId: '', serviceId, studioId: '' })
    setSelectedSlotKey('')
  }

  function handleStudioChange(studioId: string) {
    setSelection((current) => ({ ...current, producerId: '', studioId }))
    setSelectedSlotKey('')
  }

  function handleProducerChange(producerId: string) {
    setSelection((current) => ({ ...current, producerId }))
    setSelectedSlotKey('')
  }

  function handleCtaClick() {
    navigate(user ? '/dashboard' : '/login?redirect=/dashboard')
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <section
        aria-modal="true"
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-white/10 bg-zinc-950 text-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
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

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {loading ? (
            <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-onda-lavender/25 text-sm font-semibold text-onda-muted">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-onda-lavender" aria-hidden="true" />
              {t('calendarModal.loading')}
            </div>
          ) : error ? (
            <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-5 text-sm leading-7 text-amber-100">
              {t('calendarModal.error')}
            </div>
          ) : serviceChoices.length === 0 ? (
            <div className="rounded-lg border border-dashed border-onda-lavender/25 p-5 text-sm leading-7 text-onda-muted">
              {t('calendarModal.empty')}
            </div>
          ) : (
            <div className="grid gap-5">
              <div className="grid min-w-0 gap-3 rounded-lg border border-onda-lavender/15 bg-white/[0.04] p-3 md:grid-cols-3">
                <OndaSelect
                  label={t('dashboard.service')}
                  value={selection.serviceId}
                  onChange={handleServiceChange}
                  options={serviceOptions}
                />

                <OndaSelect
                  label={t('dashboard.studio')}
                  value={selection.studioId}
                  onChange={handleStudioChange}
                  options={studioOptions}
                  disabled={!hasStudioSelector}
                />

                <OndaSelect
                  label={t('dashboard.producer')}
                  value={selection.producerId}
                  onChange={handleProducerChange}
                  options={producerOptions}
                  disabled={!hasProducerSelector}
                />
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
                <div className="min-w-0 rounded-lg border border-onda-lavender/14 bg-white/[0.035] p-3 sm:p-4">
                  <AvailabilityCalendar
                    availableDateKeys={availableDateKeys}
                    bookingDateKeys={new Set<string>()}
                    language={language}
                    minDate={getStartOfToday()}
                    onDateChange={setSelectedDate}
                    selectedDate={selectedDate}
                  />
                </div>

                <aside className="min-w-0 rounded-lg border border-onda-lavender/14 bg-white/[0.035] p-4 sm:p-5">
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-onda-lavender">
                        {t('dashboard.availableTimes')}
                      </p>
                      <h3 className="mt-2 font-display text-base font-bold uppercase tracking-[0.08em] text-white">
                        {dateFormatter.format(selectedDate)}
                      </h3>
                    </div>
                    <SlidersHorizontal className="h-5 w-5 shrink-0 text-onda-lavender" aria-hidden="true" />
                  </div>

                  {filteredSlots.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-onda-lavender/25 p-5 text-sm leading-7 text-onda-muted">
                      {t('dashboard.calendar.chooseResources')}
                    </div>
                  ) : selectedDaySlots.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-onda-lavender/25 p-5 text-sm leading-7 text-onda-muted">
                      {t('dashboard.calendar.noSlots')}
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                        {selectedDaySlots.map((slot) => {
                          const slotKey = getSlotKey(slot)
                          const selected = slotKey === selectedSlotKey

                          return (
                            <button
                              key={slotKey}
                              type="button"
                              onClick={() => setSelectedSlotKey(slotKey)}
                              className={cn(
                                'min-h-12 rounded-md border px-3 py-2 text-sm font-bold transition hover:-translate-y-0.5',
                                selected
                                  ? 'border-onda-lavender bg-onda-purple text-white shadow-[0_0_18px_rgba(168,85,247,0.38)]'
                                  : 'border-onda-lavender/25 bg-white/[0.06] text-white hover:border-onda-lavender hover:bg-onda-purple/25',
                              )}
                            >
                              {slot.start_time}
                              <span className="block text-[0.65rem] font-semibold text-onda-muted">{slot.end_time}</span>
                            </button>
                          )
                        })}
                      </div>

                      {selectedSlot ? (
                        <div className="rounded-md border border-onda-lavender/18 bg-white/[0.04] p-4 text-sm leading-6 text-onda-muted">
                          <p className="font-semibold text-white">
                            {selectedSlot.start_time} - {selectedSlot.end_time}
                          </p>
                          <p className="mt-1">{selectedSlot.service_name}</p>
                          <p>
                            {[selectedSlot.studio_name, selectedSlot.producer_name].filter(Boolean).join(' / ') ||
                              t('calendarModal.noResource')}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  )}

                  <div className="mt-5 flex items-center gap-2 rounded-md border border-onda-lavender/18 bg-white/[0.04] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-onda-muted">
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                    {t('dashboard.calendar.legend')}
                  </div>
                </aside>
              </div>
            </div>
          )}
        </div>

        <footer className="flex shrink-0 flex-col gap-3 border-t border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-onda-muted">
            {t('calendarModal.footer')}
          </p>
          <button
            type="button"
            onClick={handleCtaClick}
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
