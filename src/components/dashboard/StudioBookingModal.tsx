import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { CalendarDays, Loader2, Sparkles, X } from 'lucide-react'
import OndaSelect, { type OndaSelectOption } from '../shared/OndaSelect'
import { useI18n } from '../../hooks/useI18n'
import {
  type AvailabilityException,
  type AvailabilityRule,
  type BookedSlot,
  type BookingService,
  type CreateBookingResult,
  type DiscountPreview,
  type Producer,
  type Studio,
  buildAvailableSlots,
  clearBookingDraft,
  createBooking,
  fetchBookedSlots,
  formatMoney,
  getFirstBookableService,
  getProducersForServiceAndStudio,
  getServiceById,
  getStudiosForService,
  isBookingSelectionReady,
  minutesFromTime,
  previewBookingDiscount,
  readBookingDraft,
  saveBookingDraft,
  timeFromMinutes,
  toDateKey,
} from '../../lib/dashboard'
import { supabase } from '../../lib/supabaseClient'
import { cn } from '../../lib/utils'

export interface BookingModalInitialSelection {
  bookingDate?: string | null
  endTime?: string | null
  producerId?: string | null
  serviceId?: string | null
  selectedSlots?: Array<{
    endTime: string
    startTime: string
  }>
  startTime?: string | null
  studioId?: string | null
}

interface BookingForm {
  bookingDate: string
  discountCode: string
  producerId: string
  endTime: string
  serviceId: string
  startTime: string
  studioId: string
  notes: string
}

interface StudioBookingModalProps {
  availabilityExceptions: AvailabilityException[]
  availabilityRules: AvailabilityRule[]
  clientEmail: string
  clientId: string
  clientName: string
  clientPhone?: string | null
  initialSelection: BookingModalInitialSelection | null
  open: boolean
  producers: Producer[]
  selectedDate: Date
  services: BookingService[]
  studios: Studio[]
  onBookingCreated: (result: CreateBookingResult) => Promise<void>
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

function slotKey(slot: { endTime: string; startTime: string }) {
  return `${slot.startTime}-${slot.endTime}`
}

function getContinuousSlotRange<T extends { endTime: string; startTime: string }>(slots: T[]) {
  return slots.every((slot, index) => index === 0 || slots[index - 1]?.endTime === slot.startTime) ? slots : []
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
  const draft = readBookingDraft()
  const fallbackService = getFirstBookableService(services, studios, producers)
  const selectedService =
    (initialSelection?.serviceId ? getServiceById(services, initialSelection.serviceId) : null) ?? fallbackService
  const availableStudios = getStudiosForService(selectedService, studios, producers)
  const studioId = selectedService?.requires_studio
    ? availableStudios.some((studio) => studio.id === initialSelection?.studioId)
      ? initialSelection?.studioId ?? ''
      : availableStudios[0]?.id ?? ''
    : ''
  const availableProducers = getProducersForServiceAndStudio(selectedService, studioId || null, producers)
  const producerId = selectedService?.requires_producer
    ? availableProducers.some((producer) => producer.id === initialSelection?.producerId)
      ? initialSelection?.producerId ?? ''
      : availableProducers[0]?.id ?? ''
    : ''

  return {
    bookingDate: initialSelection?.bookingDate ?? draft?.booking_date ?? toDateKey(selectedDate),
    discountCode: draft?.discount_code ?? '',
    producerId,
    endTime: initialSelection?.endTime
      ?? (initialSelection?.startTime && selectedService
        ? timeFromMinutes(minutesFromTime(initialSelection.startTime) + selectedService.duration_minutes)
        : ''),
    serviceId: selectedService?.id ?? '',
    startTime: initialSelection?.startTime ?? '',
    studioId,
    notes: draft?.notes ?? '',
  }
}

export default function StudioBookingModal({
  availabilityExceptions,
  availabilityRules,
  clientEmail,
  clientId,
  clientName,
  clientPhone,
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
  const [applyingDiscount, setApplyingDiscount] = useState(false)
  const [appliedDiscountCode, setAppliedDiscountCode] = useState<string | null>(null)
  const [discountPreview, setDiscountPreview] = useState<DiscountPreview | null>(null)
  const [discountMessage, setDiscountMessage] = useState<string | null>(null)
  const [bookingError, setBookingError] = useState<string | null>(null)

  const selectedService = useMemo(
    () => getServiceById(services, bookingForm.serviceId),
    [bookingForm.serviceId, services],
  )
  const availableStudios = useMemo(
    () => getStudiosForService(selectedService, studios, producers),
    [producers, selectedService, studios],
  )
  const availableProducers = useMemo(
    () => getProducersForServiceAndStudio(selectedService, bookingForm.studioId || null, producers),
    [bookingForm.studioId, producers, selectedService],
  )
  const resourceUnavailableMessage = useMemo(() => {
    if (selectedService?.requires_studio && availableStudios.length === 0) {
      return t('booking.noStudiosForService')
    }

    if (selectedService?.requires_producer && availableProducers.length === 0) {
      return t('booking.noProducersForSelection')
    }

    return null
  }, [availableProducers.length, availableStudios.length, selectedService, t])
  const selectionLocked = Boolean(
    initialSelection?.serviceId &&
      initialSelection.bookingDate &&
      initialSelection.startTime &&
      bookingForm.serviceId &&
      bookingForm.bookingDate &&
      bookingForm.startTime,
  )
  const selectionReady = useMemo(
    () =>
      isBookingSelectionReady(services, {
        serviceId: bookingForm.serviceId,
        studioId: bookingForm.studioId || null,
        producerId: bookingForm.producerId || null,
      }, { producers, studios }),
    [bookingForm.producerId, bookingForm.serviceId, bookingForm.studioId, producers, services, studios],
  )
  const availableSlots = useMemo(() => {
    if (!selectionReady) return []

    return buildAvailableSlots({
      bookedSlots,
      date: bookingForm.bookingDate,
      exceptions: availabilityExceptions,
      producerId: bookingForm.producerId || null,
      producers,
      rules: availabilityRules,
      serviceId: bookingForm.serviceId,
      services,
      studioId: bookingForm.studioId || null,
      studios,
    })
  }, [
    availabilityExceptions,
    availabilityRules,
    bookedSlots,
    bookingForm.bookingDate,
    bookingForm.producerId,
    bookingForm.serviceId,
    bookingForm.studioId,
    producers,
    selectionReady,
    services,
    studios,
  ])
  const sortedAvailableSlots = useMemo(
    () => [...availableSlots].sort((left, right) => minutesFromTime(left.startTime) - minutesFromTime(right.startTime)),
    [availableSlots],
  )
  const selectedSlots = useMemo(() => {
    if (!bookingForm.startTime || !bookingForm.endTime) return []

    const startIndex = sortedAvailableSlots.findIndex((slot) => slot.startTime === bookingForm.startTime)
    const endIndex = sortedAvailableSlots.findIndex((slot) => slot.endTime === bookingForm.endTime)

    if (startIndex < 0 || endIndex < startIndex) return []

    const range = sortedAvailableSlots.slice(startIndex, endIndex + 1)
    const isContinuous = range.every((slot, index) => index === 0 || range[index - 1]?.endTime === slot.startTime)

    return isContinuous ? range : []
  }, [bookingForm.endTime, bookingForm.startTime, sortedAvailableSlots])
  const selectedSlotCount = selectedSlots.length
  const selectedRangeStart = selectedSlots[0]?.startTime ?? ''
  const selectedRangeEnd = selectedSlots[selectedSlots.length - 1]?.endTime ?? ''
  const selectedTotalMinutes = selectedRangeStart && selectedRangeEnd
    ? minutesFromTime(selectedRangeEnd) - minutesFromTime(selectedRangeStart)
    : 0
  const selectedTotalHours = selectedTotalMinutes > 0 ? selectedTotalMinutes / 60 : 0
  const totalAmount = (selectedService?.price_per_slot ?? 0) * selectedSlotCount
  const depositPercent = selectedService?.deposit_percent ?? 50
  const depositAmount = Math.round((totalAmount * depositPercent) / 100)
  const discountAmount = discountPreview?.discount_amount ?? 0
  const depositAmountDue = discountPreview?.deposit_amount_due ?? depositAmount
  const selectedStudio = useMemo(
    () => studios.find((studio) => studio.id === bookingForm.studioId) ?? null,
    [bookingForm.studioId, studios],
  )
  const selectedProducer = useMemo(
    () => producers.find((producer) => producer.id === bookingForm.producerId) ?? null,
    [bookingForm.producerId, producers],
  )
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
      {
        value: '',
        label:
          availableStudios.length > 0
            ? t('booking.selectStudio')
            : t('booking.noStudiosForService'),
        disabled: true,
      },
      ...availableStudios.map((studio) => ({ value: studio.id, label: studio.name })),
    ],
    [availableStudios, t],
  )
  const producerOptions = useMemo<OndaSelectOption[]>(
    () => [
      {
        value: '',
        label:
          availableProducers.length > 0
            ? t('booking.selectProducer')
            : t('booking.noProducersForSelection'),
        disabled: true,
      },
      ...availableProducers.map((producer) => ({
        value: producer.id,
        label: producer.name,
        description: producer.specialty ?? undefined,
      })),
    ],
    [availableProducers, t],
  )

  const clearDiscount = useCallback(() => {
    setAppliedDiscountCode(null)
    setDiscountMessage(null)
    setDiscountPreview(null)
  }, [])

  const resetForm = useCallback(() => {
    setBookingForm(buildInitialForm(selectedDate, services, studios, producers, initialSelection))
    setBookedSlots([])
    clearDiscount()
    setBookingError(null)
  }, [clearDiscount, initialSelection, producers, selectedDate, services, studios])

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

  useEffect(() => {
    if (!open || !bookingForm.serviceId) return

    saveBookingDraft({
      booking_date: bookingForm.bookingDate,
      discount_code: bookingForm.discountCode,
      notes: bookingForm.notes,
      producer_id: bookingForm.producerId || null,
      selected_slots: selectedSlots.map((slot) => ({
        endTime: slot.endTime,
        startTime: slot.startTime,
      })),
      service_id: bookingForm.serviceId,
      studio_id: bookingForm.studioId || null,
    })
  }, [
    bookingForm.bookingDate,
    bookingForm.discountCode,
    bookingForm.notes,
    bookingForm.producerId,
    bookingForm.serviceId,
    bookingForm.studioId,
    open,
    selectedSlots,
  ])

  useEffect(() => {
    if (!open || !selectionLocked || loadingSlots || selectedSlotCount > 0) return

    setBookingError(t('booking.error.slotUnavailable'))
  }, [loadingSlots, open, selectedSlotCount, selectionLocked, t])

  const closeModal = () => {
    if (savingBooking) return
    onClose()
  }

  const handleServiceChange = (serviceId: string) => {
    const nextService = getServiceById(services, serviceId)
    const nextStudios = getStudiosForService(nextService, studios, producers)
    const nextStudioId = nextService?.requires_studio ? nextStudios[0]?.id ?? '' : ''
    const nextProducers = getProducersForServiceAndStudio(nextService, nextStudioId || null, producers)

    setBookingForm((current) => ({
      ...current,
      discountCode: '',
      producerId: nextService?.requires_producer ? nextProducers[0]?.id ?? '' : '',
      endTime: '',
      serviceId,
      startTime: '',
      studioId: nextStudioId,
    }))
    clearDiscount()
  }

  const handleStudioChange = (studioId: string) => {
    const nextProducers = getProducersForServiceAndStudio(selectedService, studioId || null, producers)

    setBookingForm((current) => ({
      ...current,
      discountCode: '',
      endTime: '',
      producerId: selectedService?.requires_producer
        ? nextProducers.some((producer) => producer.id === current.producerId)
          ? current.producerId
          : nextProducers[0]?.id ?? ''
        : '',
      startTime: '',
      studioId,
    }))
    clearDiscount()
  }

  const handleSlotClick = (slot: { endTime: string; startTime: string }) => {
    setBookingError(null)
    clearDiscount()

    if (!bookingForm.startTime || selectedSlots.length > 1) {
      setBookingForm((current) => ({ ...current, endTime: slot.endTime, startTime: slot.startTime }))
      return
    }

    const currentStartIndex = sortedAvailableSlots.findIndex((availableSlot) => availableSlot.startTime === bookingForm.startTime)
    const nextIndex = sortedAvailableSlots.findIndex((availableSlot) => availableSlot.startTime === slot.startTime)

    if (currentStartIndex < 0 || nextIndex < 0) {
      setBookingForm((current) => ({ ...current, endTime: slot.endTime, startTime: slot.startTime }))
      return
    }

    const startIndex = Math.min(currentStartIndex, nextIndex)
    const endIndex = Math.max(currentStartIndex, nextIndex)
    const range = sortedAvailableSlots.slice(startIndex, endIndex + 1)
    const isContinuous = range.every((rangeSlot, index) => index === 0 || range[index - 1]?.endTime === rangeSlot.startTime)

    if (!isContinuous) {
      setBookingError(t('booking.error.nonContinuousSlots'))
      return
    }

    setBookingForm((current) => ({
      ...current,
      endTime: range[range.length - 1]?.endTime ?? slot.endTime,
      startTime: range[0]?.startTime ?? slot.startTime,
    }))
  }

  const handleApplyDiscount = async () => {
    const discountCode = bookingForm.discountCode.trim()

    if (!discountCode || !selectedService || selectedSlotCount === 0) {
      setDiscountMessage(null)
      setBookingError(t('booking.discountInvalid'))
      return
    }

    setApplyingDiscount(true)
    setBookingError(null)
    setDiscountMessage(null)

    try {
      const preview = await previewBookingDiscount({
        discountCode,
        serviceId: selectedService.id,
        slotCount: selectedSlotCount,
      })

      setAppliedDiscountCode(discountCode.toUpperCase())
      setDiscountPreview(preview)
      setDiscountMessage(t('booking.discountApplied'))
    } catch {
      clearDiscount()
      setBookingError(t('booking.discountInvalid'))
    } finally {
      setApplyingDiscount(false)
    }
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

    if (!selectionReady || selectedSlotCount === 0) {
      setBookingError(t('booking.error.incompleteSelection'))
      return
    }

    setSavingBooking(true)
    setBookingError(null)

    try {
      const latestBookedSlots = await fetchBookedSlots({
        bookingDate: bookingForm.bookingDate,
        serviceId: bookingForm.serviceId,
        studioId: selectedService.requires_studio ? bookingForm.studioId : null,
        producerId: selectedService.requires_producer ? bookingForm.producerId : null,
      })
      const latestAvailableSlots = buildAvailableSlots({
        bookedSlots: latestBookedSlots,
        date: bookingForm.bookingDate,
        exceptions: availabilityExceptions,
        producerId: selectedService.requires_producer ? bookingForm.producerId : null,
        producers,
        rules: availabilityRules,
        serviceId: bookingForm.serviceId,
        services,
        studioId: selectedService.requires_studio ? bookingForm.studioId : null,
        studios,
      })
      const latestAvailableSlotKeys = new Set(latestAvailableSlots.map(slotKey))
      const stillValidSlots = selectedSlots.filter((slot) => latestAvailableSlotKeys.has(slotKey(slot)))

      if (stillValidSlots.length !== selectedSlots.length) {
        const continuousSlots = getContinuousSlotRange(stillValidSlots)

        setBookedSlots(latestBookedSlots)
        setBookingForm((current) => ({
          ...current,
          endTime: continuousSlots[continuousSlots.length - 1]?.endTime ?? '',
          startTime: continuousSlots[0]?.startTime ?? '',
        }))

        throw new Error(t('booking.error.slotUnavailable'))
      }

      const result = await createBooking({
        bookingDate: bookingForm.bookingDate,
        clientId,
        discountCode: appliedDiscountCode || bookingForm.discountCode.trim() || null,
        endTime: selectedRangeEnd,
        notes: bookingForm.notes.trim() || null,
        producerId: selectedService.requires_producer ? bookingForm.producerId : null,
        selectedSlots: selectedSlots.map((slot) => ({
          endTime: slot.endTime,
          startTime: slot.startTime,
        })),
        serviceId: bookingForm.serviceId,
        startTime: selectedRangeStart,
        studioId: selectedService.requires_studio ? bookingForm.studioId : null,
      })

      const selectedStudio = studios.find((studio) => studio.id === bookingForm.studioId)
      const selectedProducer = producers.find((producer) => producer.id === bookingForm.producerId)
      const normalizedClientEmail = clientEmail.trim()

      try {
        const bookingConfirmation = await supabase.functions.invoke('send-booking-confirmation', {
          body: {
            customerName: clientName,
            date: bookingForm.bookingDate,
            email: normalizedClientEmail || null,
            phone: clientPhone ?? null,
            notes: bookingForm.notes.trim() || null,
            producer: selectedProducer?.name ?? null,
            service: selectedService.name,
            studio: selectedStudio?.name ?? null,
            time: `${selectedRangeStart} - ${selectedRangeEnd}`,
          },
        })

        if (bookingConfirmation.error || bookingConfirmation.data?.success === false) {
          console.warn('La reserva fue creada, pero no se pudo completar el flujo de correos de reserva.', bookingConfirmation.error ?? bookingConfirmation.data)
        }
      } catch (error) {
        console.warn('La reserva fue creada, pero no se pudo invocar el flujo de correos de reserva.', error)
      }

      if (!normalizedClientEmail) {
        console.warn('La reserva fue creada, pero no hay email de cliente para enviar confirmación.')
      }

      await onBookingCreated(result)
      clearBookingDraft()
      onClose()

      if (result.payment_checkout_url) {
        window.location.assign(result.payment_checkout_url)
      }
    } catch (error) {
      setBookingError(
        isSlotTakenError(error)
          ? t('booking.error.slotRangeTaken')
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
          {!selectionLocked ? (
            <>
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
                  onChange={handleStudioChange}
                  options={studioOptions}
                  disabled={availableStudios.length === 0}
                  required
                />
              ) : null}

              {selectedService?.requires_producer ? (
                <OndaSelect
                  label={t('dashboard.producer')}
                  value={bookingForm.producerId}
                  onChange={(producerId) => {
                    setBookingForm((current) => ({
                      ...current,
                      discountCode: '',
                      endTime: '',
                      producerId,
                      startTime: '',
                    }))
                    clearDiscount()
                  }}
                  options={producerOptions}
                  disabled={availableProducers.length === 0}
                  required
                />
              ) : null}
            </>
          ) : null}

          {resourceUnavailableMessage ? (
            <div className="rounded-md border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-700 dark:text-amber-100">
              {resourceUnavailableMessage}
            </div>
          ) : null}

          {!selectionLocked ? (
            <>
              <label className={modalLabelClassName}>
                {t('dashboard.date')}
                <input
                  type="date"
                  min={toDateKey(new Date())}
                  value={bookingForm.bookingDate}
                  onChange={(event) => {
                    setBookingForm((current) => ({
                      ...current,
                      bookingDate: event.target.value,
                      discountCode: '',
                      endTime: '',
                      startTime: '',
                    }))
                    clearDiscount()
                  }}
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
                ) : resourceUnavailableMessage ? (
                  <div className="rounded-md border border-dashed border-onda-lavender/25 p-4 text-sm leading-7 text-onda-muted">
                    {resourceUnavailableMessage}
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
                    {sortedAvailableSlots.map((slot) => {
                      const selected = selectedSlots.some((selectedSlot) => selectedSlot.startTime === slot.startTime)

                      return (
                        <button
                          key={`${slot.startTime}-${slot.endTime}`}
                          type="button"
                          onClick={() => handleSlotClick(slot)}
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
            </>
          ) : null}

          <label className={modalLabelClassName}>
            {t('dashboard.notesAdditional')}
            <textarea
              value={bookingForm.notes}
              onChange={(event) => setBookingForm((current) => ({ ...current, notes: event.target.value }))}
              className={cn(modalFieldClassName, 'min-h-28 resize-y')}
              placeholder={t('booking.notesPlaceholder')}
            />
          </label>

          {selectedSlotCount > 0 && selectedService ? (
            <div className="rounded-md border border-onda-lavender/18 bg-white/[0.04] p-4 text-sm leading-6 text-onda-muted">
              <div className="grid gap-1">
                <p>
                  {t('dashboard.service')}: <span className="font-semibold text-zinc-950 dark:text-white">{selectedService.name}</span>
                </p>
                <p>
                  {t('dashboard.studio')}: {selectedStudio?.name ?? t('dashboard.notApplicable')}
                </p>
                <p>
                  {t('dashboard.producer')}: {selectedProducer?.name ?? t('dashboard.toConfirm')}
                </p>
                <p>{t('dashboard.date')}: {dateFormatter.format(new Date(`${bookingForm.bookingDate}T00:00:00`))}</p>
                <p className="font-semibold text-zinc-950 dark:text-white">
                  {selectedRangeStart} - {selectedRangeEnd}
                </p>
                <p>{t('booking.price.slots')}: {selectedSlotCount}</p>
                <p>{t('booking.price.duration')}: {selectedTotalHours.toFixed(selectedTotalHours % 1 === 0 ? 0 : 1)} h</p>
                <p>
                  {t('booking.pricePerSlot')}: {formatMoney(selectedService.price_per_slot, selectedService.currency, language === 'en' ? 'en-US' : 'es-CL')}
                </p>
                <p>{t('booking.total')}: {formatMoney(totalAmount, selectedService.currency, language === 'en' ? 'en-US' : 'es-CL')}</p>
                <p>
                  {t('booking.depositRequired')}: {formatMoney(depositAmount, selectedService.currency, language === 'en' ? 'en-US' : 'es-CL')} ({depositPercent}%)
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <label className={modalLabelClassName}>
                    {t('booking.discountCode')}
                    <input
                      value={bookingForm.discountCode}
                      onChange={(event) => {
                        setBookingForm((current) => ({ ...current, discountCode: event.target.value }))
                        clearDiscount()
                      }}
                      className={modalFieldClassName}
                      placeholder={t('booking.discountPlaceholder')}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleApplyDiscount}
                    disabled={applyingDiscount || !bookingForm.discountCode.trim()}
                    className="self-end inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-onda-lavender/25 px-4 py-3 font-display text-xs font-bold uppercase tracking-[0.12em] text-onda-lavender transition hover:bg-onda-purple/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {applyingDiscount ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                    {t('booking.applyDiscount')}
                  </button>
                </div>
                {discountMessage ? (
                  <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-100">
                    {discountMessage}
                  </p>
                ) : null}
                <p>{t('booking.depositOriginal')}: {formatMoney(depositAmount, selectedService.currency, language === 'en' ? 'en-US' : 'es-CL')}</p>
                <p>{t('booking.discountAppliedAmount')}: {formatMoney(discountAmount, selectedService.currency, language === 'en' ? 'en-US' : 'es-CL')}</p>
                <p className="font-semibold text-zinc-950 dark:text-white">
                  {t('booking.depositDue')}: {formatMoney(depositAmountDue, selectedService.currency, language === 'en' ? 'en-US' : 'es-CL')}
                </p>
                <p className="mt-2 text-xs font-semibold text-onda-muted">
                  {depositAmountDue > 0 ? t('booking.paymentSoon') : t('booking.discountWaivesDeposit')}
                </p>
              </div>
            </div>
          ) : null}

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
              disabled={savingBooking || selectedSlotCount === 0}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-onda-purple px-4 py-3 font-display text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-onda-electric disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingBooking ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              )}
              {depositAmountDue > 0 ? t('booking.requestBooking') : t('booking.bookWithoutPayment')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
