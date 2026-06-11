import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { CalendarDays, Loader2, Sparkles, X } from 'lucide-react'
import OndaSelect, { type OndaSelectOption } from '../shared/OndaSelect'
import { useI18n } from '../../hooks/useI18n'
import {
  type AvailabilityException,
  type AvailabilityRule,
  type BookedSlot,
  type BookingService,
  type Producer,
  type Studio,
  buildAvailableSlots,
  createBooking,
  fetchBookedSlots,
  getFirstBookableService,
  getServiceById,
  isBookingSelectionReady,
  minutesFromTime,
  timeFromMinutes,
  toDateKey,
} from '../../lib/dashboard'
import { cn } from '../../lib/utils'

export interface BookingModalInitialSelection {
  bookingDate?: string | null
  producerId?: string | null
  serviceId?: string | null
  startTime?: string | null
  studioId?: string | null
}

interface BookingForm {
  bookingDate: string
  producerId: string
  serviceId: string
  startTime: string
  studioId: string
  notes: string
}

interface StudioBookingModalProps {
  availabilityExceptions: AvailabilityException[]
  availabilityRules: AvailabilityRule[]
  clientId: string
  initialSelection: BookingModalInitialSelection | null
  open: boolean
  producers: Producer[]
  selectedDate: Date
  services: BookingService[]
  studios: Studio[]
  onBookingCreated: () => Promise<void>
  onClose: () => void
}

function isSlotTakenError(error: unknown) {
  return typeof error === 'object' && error && 'code' in error && error.code === '23505'
}

function isSessionValidationError(error: unknown) {
  if (!(typeof error === 'object' && error)) return false

  const maybeError = error as { code?: string; message?: string }
  return maybeError.code === '42501' || maybeError.message?.toLowerCase().includes('row-level security') === true
}

const modalFieldClassName =
  'min-h-12 w-full min-w-0 rounded-md border border-onda-purple/20 bg-white/[0.82] px-4 py-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-500 focus:border-onda-purple focus:ring-2 focus:ring-onda-purple/25 dark:border-onda-lavender/20 dark:bg-white/10 dark:text-white dark:placeholder:text-onda-muted/70 dark:focus:border-onda-lavender dark:focus:ring-onda-purple/40'
const modalLabelClassName = 'grid min-w-0 gap-2 text-sm font-semibold text-zinc-700 dark:text-onda-soft'

function buildInitialForm(
  selectedDate: Date,
  services: BookingService[],
  studios: Studio[],
  producers: Producer[],
  initialSelection: BookingModalInitialSelection | null,
): BookingForm {
  const fallbackService = getFirstBookableService(services, studios, producers)
  const selectedService =
    (initialSelection?.serviceId ? getServiceById(services, initialSelection.serviceId) : null) ?? fallbackService

  return {
    bookingDate: initialSelection?.bookingDate ?? toDateKey(selectedDate),
    producerId: selectedService?.requires_producer ? initialSelection?.producerId ?? producers[0]?.id ?? '' : '',
    serviceId: selectedService?.id ?? '',
    startTime: initialSelection?.startTime ?? '',
    studioId: selectedService?.requires_studio ? initialSelection?.studioId ?? studios[0]?.id ?? '' : '',
    notes: '',
  }
}

export default function StudioBookingModal({
  availabilityExceptions,
  availabilityRules,
  clientId,
  initialSelection,
  open,
  producers,
  selectedDate,
  services,
  studios,
  onBookingCreated,
  onClose,
}: StudioBookingModalProps) {
  const { language, t } = useI18n()
  const [bookingForm, setBookingForm] = useState<BookingForm>(() =>
    buildInitialForm(selectedDate, services, studios, producers, initialSelection),
  )
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [savingBooking, setSavingBooking] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)

  const selectedService = useMemo(
    () => getServiceById(services, bookingForm.serviceId),
    [bookingForm.serviceId, services],
  )
  const selectionReady = useMemo(
    () =>
      isBookingSelectionReady(services, {
        serviceId: bookingForm.serviceId,
        studioId: bookingForm.studioId || null,
        producerId: bookingForm.producerId || null,
      }),
    [bookingForm.producerId, bookingForm.serviceId, bookingForm.studioId, services],
  )
  const availableSlots = useMemo(() => {
    if (!selectionReady) return []

    return buildAvailableSlots({
      bookedSlots,
      date: bookingForm.bookingDate,
      exceptions: availabilityExceptions,
      producerId: bookingForm.producerId || null,
      rules: availabilityRules,
      serviceId: bookingForm.serviceId,
      services,
      studioId: bookingForm.studioId || null,
    })
  }, [
    availabilityExceptions,
    availabilityRules,
    bookedSlots,
    bookingForm.bookingDate,
    bookingForm.producerId,
    bookingForm.serviceId,
    bookingForm.studioId,
    selectionReady,
    services,
  ])
  const selectedSlot = availableSlots.find((slot) => slot.startTime === bookingForm.startTime) ?? null
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
  const serviceOptions = useMemo<OndaSelectOption[]>(
    () => [
      { value: '', label: t('booking.selectService'), disabled: true },
      ...services.map((service) => ({
        value: service.id,
        label: `${service.name} - ${service.duration_minutes} ${t('common.minutesShort')}`,
      })),
    ],
    [services, t],
  )
  const studioOptions = useMemo<OndaSelectOption[]>(
    () => [
      { value: '', label: t('booking.selectStudio'), disabled: true },
      ...studios.map((studio) => ({ value: studio.id, label: studio.name })),
    ],
    [studios, t],
  )
  const producerOptions = useMemo<OndaSelectOption[]>(
    () => [
      { value: '', label: t('booking.selectProducer'), disabled: true },
      ...producers.map((producer) => ({
        value: producer.id,
        label: producer.name,
        description: producer.specialty ?? undefined,
      })),
    ],
    [producers, t],
  )

  const resetForm = useCallback(() => {
    setBookingForm(buildInitialForm(selectedDate, services, studios, producers, initialSelection))
    setBookedSlots([])
    setBookingError(null)
  }, [initialSelection, producers, selectedDate, services, studios])

  useEffect(() => {
    if (!open) return undefined

    const timeoutId = window.setTimeout(resetForm, 0)
    return () => window.clearTimeout(timeoutId)
  }, [open, resetForm])

  useEffect(() => {
    if (!open || !selectionReady || !bookingForm.bookingDate) {
      setBookedSlots([])
      return undefined
    }

    let active = true
    setLoadingSlots(true)
    setBookingError(null)

    fetchBookedSlots({
      bookingDate: bookingForm.bookingDate,
      serviceId: bookingForm.serviceId,
      studioId: bookingForm.studioId || null,
      producerId: bookingForm.producerId || null,
    })
      .then((slots) => {
        if (active) setBookedSlots(slots)
      })
      .catch((error) => {
        if (!active) return
        setBookingError(error instanceof Error ? error.message : t('booking.error.loadSlots'))
        setBookedSlots([])
      })
      .finally(() => {
        if (active) setLoadingSlots(false)
      })

    return () => {
      active = false
    }
  }, [
    bookingForm.bookingDate,
    bookingForm.producerId,
    bookingForm.serviceId,
    bookingForm.studioId,
    open,
    selectionReady,
    t,
  ])

  const closeModal = () => {
    if (savingBooking) return
    onClose()
  }

  const handleServiceChange = (serviceId: string) => {
    const nextService = getServiceById(services, serviceId)

    setBookingForm((current) => ({
      ...current,
      producerId: nextService?.requires_producer ? producers[0]?.id ?? '' : '',
      serviceId,
      startTime: '',
      studioId: nextService?.requires_studio ? studios[0]?.id ?? '' : '',
    }))
  }

  const handleCreateBooking = async (event: FormEvent) => {
    event.preventDefault()

    if (!clientId) {
      setBookingError(t('booking.error.sessionInvalid'))
      return
    }

    if (!selectedService || !bookingForm.serviceId) {
      setBookingError(t('booking.error.serviceRequired'))
      return
    }

    if (selectedService.requires_studio && !bookingForm.studioId) {
      setBookingError(t('booking.error.studioRequired'))
      return
    }

    if (selectedService.requires_producer && !bookingForm.producerId) {
      setBookingError(t('booking.error.producerRequired'))
      return
    }

    if (!selectionReady || !selectedSlot) {
      setBookingError(t('booking.error.incompleteSelection'))
      return
    }

    setSavingBooking(true)
    setBookingError(null)

    try {
      await createBooking({
        bookingDate: bookingForm.bookingDate,
        clientId,
        endTime:
          selectedSlot.endTime ??
          timeFromMinutes(minutesFromTime(bookingForm.startTime) + selectedService.duration_minutes),
        notes: bookingForm.notes.trim() || null,
        producerId: selectedService.requires_producer ? bookingForm.producerId : null,
        serviceId: bookingForm.serviceId,
        startTime: bookingForm.startTime,
        studioId: selectedService.requires_studio ? bookingForm.studioId : null,
      })
      await onBookingCreated()
      onClose()
    } catch (error) {
      setBookingError(
        isSlotTakenError(error)
          ? t('booking.error.slotTaken')
          : isSessionValidationError(error)
            ? t('booking.error.sessionInvalid')
          : error instanceof Error
            ? error.message
            : t('booking.error.saveFailed'),
      )
    } finally {
      setSavingBooking(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={closeModal}
      role="presentation"
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto overflow-x-hidden rounded-lg border border-onda-purple/20 bg-white p-5 text-zinc-950 shadow-[0_30px_90px_rgba(24,24,27,0.2)] sm:p-6 dark:border-onda-lavender/20 dark:bg-onda-night dark:text-white dark:shadow-[0_30px_90px_rgba(123,44,255,0.28)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-modal-title"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-onda-lavender">
              {t('booking.modal.eyebrow')}
            </p>
            <h2 id="booking-modal-title" className="mt-2 font-display text-xl font-bold uppercase tracking-[0.08em]">
              {dateFormatter.format(new Date(`${bookingForm.bookingDate}T00:00:00`))}
            </h2>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-onda-lavender/25 text-onda-lavender transition hover:bg-onda-purple hover:text-white"
            aria-label={t('booking.closeModal')}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleCreateBooking} className="grid gap-5">
          <OndaSelect
            label={t('dashboard.service')}
            value={bookingForm.serviceId}
            onChange={handleServiceChange}
            options={serviceOptions}
            required
          />

          {selectedService?.requires_studio ? (
            <OndaSelect
              label={t('dashboard.studio')}
              value={bookingForm.studioId}
              onChange={(studioId) =>
                setBookingForm((current) => ({
                  ...current,
                  startTime: '',
                  studioId,
                }))
              }
              options={studioOptions}
              required
            />
          ) : null}

          {selectedService?.requires_producer ? (
            <OndaSelect
              label={t('dashboard.producer')}
              value={bookingForm.producerId}
              onChange={(producerId) =>
                setBookingForm((current) => ({
                  ...current,
                  producerId,
                  startTime: '',
                }))
              }
              options={producerOptions}
              required
            />
          ) : null}

          <label className={modalLabelClassName}>
            {t('dashboard.date')}
            <input
              type="date"
              min={toDateKey(new Date())}
              value={bookingForm.bookingDate}
              onChange={(event) =>
                setBookingForm((current) => ({
                  ...current,
                  bookingDate: event.target.value,
                  startTime: '',
                }))
              }
              className={modalFieldClassName}
              required
            />
          </label>

          <fieldset className="grid gap-3">
            <legend className="text-sm font-semibold text-zinc-700 dark:text-onda-soft">
              {t('booking.availableTime')}
            </legend>
            {loadingSlots ? (
              <div className="flex min-h-24 items-center justify-center rounded-md border border-dashed border-onda-lavender/25 text-sm font-semibold text-onda-muted">
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-onda-lavender" aria-hidden="true" />
                {t('booking.loadingSlots')}
              </div>
            ) : !selectedService ? (
              <div className="rounded-md border border-dashed border-onda-lavender/25 p-4 text-sm leading-7 text-onda-muted">
                {t('booking.chooseServiceForSlots')}
              </div>
            ) : !selectionReady ? (
              <div className="rounded-md border border-dashed border-onda-lavender/25 p-4 text-sm leading-7 text-onda-muted">
                {t('booking.completeResources')}
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="rounded-md border border-dashed border-onda-lavender/25 p-4 text-sm leading-7 text-onda-muted">
                {t('booking.noSlotsForDate')}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {availableSlots.map((slot) => {
                  const selected = bookingForm.startTime === slot.startTime

                  return (
                    <button
                      key={`${slot.startTime}-${slot.endTime}`}
                      type="button"
                      onClick={() => setBookingForm((current) => ({ ...current, startTime: slot.startTime }))}
                      className={cn(
                        'min-h-12 rounded-md border px-3 py-2 text-sm font-bold transition',
                        selected
                          ? 'border-onda-lavender bg-onda-purple text-white shadow-[0_0_18px_rgba(168,85,247,0.38)]'
                          : 'border-onda-purple/20 bg-white/75 text-zinc-950 hover:border-onda-purple hover:bg-onda-purple/10 dark:border-onda-lavender/20 dark:bg-white/[0.06] dark:text-onda-soft dark:hover:border-onda-lavender dark:hover:bg-onda-purple/20',
                      )}
                    >
                      {slot.startTime}
                      <span className="block text-[0.65rem] font-semibold text-onda-muted">{slot.endTime}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </fieldset>

          <label className={modalLabelClassName}>
            {t('dashboard.notesAdditional')}
            <textarea
              value={bookingForm.notes}
              onChange={(event) => setBookingForm((current) => ({ ...current, notes: event.target.value }))}
              className={cn(modalFieldClassName, 'min-h-28 resize-y')}
              placeholder={t('booking.notesPlaceholder')}
            />
          </label>

          {bookingError ? (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
              {bookingError}
            </div>
          ) : null}

          <div className="flex items-start gap-2 rounded-md border border-onda-lavender/15 bg-white/[0.04] px-4 py-3 text-xs leading-6 text-onda-muted">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-onda-lavender" aria-hidden="true" />
            {t('booking.pendingNotice')}
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeModal}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-onda-lavender/25 px-4 py-3 font-display text-xs font-bold uppercase tracking-[0.12em] text-onda-lavender transition hover:bg-onda-purple/10"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={savingBooking || !selectedSlot}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-onda-purple px-4 py-3 font-display text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-onda-electric disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingBooking ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              )}
              {t('booking.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
