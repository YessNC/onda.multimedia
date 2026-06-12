import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, Clock, Loader2, Plus, SlidersHorizontal, XCircle } from 'lucide-react'
import type { BookingModalInitialSelection } from './StudioBookingModal'
import AvailabilityCalendar from '../shared/AvailabilityCalendar'
import OndaSelect, { type OndaSelectOption } from '../shared/OndaSelect'
import { useI18n } from '../../hooks/useI18n'
import {
  type AvailabilityException,
  type AvailabilityRule,
  type AvailabilitySlot,
  type Booking,
  type BookingService,
  type Producer,
  type Studio,
  buildAvailableSlots,
  fetchBookedSlots,
  getAvailableDateKeys,
  getFirstBookableService,
  getProducersForServiceAndStudio,
  getServiceById,
  getStartOfToday,
  getStudiosForService,
  isBookingSelectionReady,
  formatMoney,
  minutesFromTime,
  normalizeTime,
  paymentStatusClassName,
  readBookingDraft,
  saveBookingDraft,
  serviceCanBeBooked,
  statusClassName,
  toDateKey,
} from '../../lib/dashboard'
import { cn } from '../../lib/utils'

interface DashboardCalendarProps {
  availabilityExceptions: AvailabilityException[]
  availabilityRules: AvailabilityRule[]
  bookingDates: Set<string>
  cancellingBookingId: string | null
  canBook: boolean
  bookings: Booking[]
  producers: Producer[]
  selectedDate: Date
  services: BookingService[]
  studios: Studio[]
  onCancelBooking: (booking: Booking) => Promise<void>
  onDateChange: (date: Date) => void
  onOpenBookingModal: (initialSelection?: BookingModalInitialSelection) => void
}

interface CalendarSelection {
  serviceId: string
  studioId: string
  producerId: string
}

const emptySelection: CalendarSelection = {
  serviceId: '',
  studioId: '',
  producerId: '',
}

function slotKey(slot: { endTime: string; startTime: string }) {
  return `${slot.startTime}-${slot.endTime}`
}

function getContinuousSlotRange(slots: AvailabilitySlot[]) {
  return slots.every((slot, index) => index === 0 || slots[index - 1]?.endTime === slot.startTime) ? slots : []
}

function getServiceResourceHint(service: BookingService | null) {
  if (!service) return 'dashboard.calendar.hint.chooseService'
  if (service.requires_studio && service.requires_producer) return 'dashboard.calendar.hint.studioProducer'
  if (service.requires_studio) return 'dashboard.calendar.hint.studio'
  if (service.requires_producer) return 'dashboard.calendar.hint.producer'
  return 'dashboard.calendar.hint.noResource'
}

export default function DashboardCalendar({
  availabilityExceptions,
  availabilityRules,
  bookingDates,
  bookings,
  cancellingBookingId,
  canBook,
  producers,
  selectedDate,
  services,
  studios,
  onCancelBooking,
  onDateChange,
  onOpenBookingModal,
}: DashboardCalendarProps) {
  const { language, t } = useI18n()
  const [selection, setSelection] = useState<CalendarSelection>(emptySelection)
  const [bookedSlots, setBookedSlots] = useState<AvailabilitySlot[]>([])
  const [selectedSlots, setSelectedSlots] = useState<AvailabilitySlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotsError, setSlotsError] = useState<string | null>(null)
  const [selectionNotice, setSelectionNotice] = useState<string | null>(null)
  const restoredDraftRef = useRef(false)

  const selectedDateKey = toDateKey(selectedDate)
  const selectedService = useMemo(() => getServiceById(services, selection.serviceId), [selection.serviceId, services])
  const availableStudios = useMemo(
    () => getStudiosForService(selectedService, studios, producers),
    [producers, selectedService, studios],
  )
  const availableProducers = useMemo(
    () => getProducersForServiceAndStudio(selectedService, selection.studioId || null, producers),
    [producers, selectedService, selection.studioId],
  )
  const resourceUnavailableMessage = useMemo(() => {
    if (selectedService?.requires_studio && availableStudios.length === 0) {
      return t('dashboard.calendar.noStudiosForService')
    }

    if (selectedService?.requires_producer && availableProducers.length === 0) {
      return t('dashboard.calendar.noProducersForSelection')
    }

    return null
  }, [availableProducers.length, availableStudios.length, selectedService, t])
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
      {
        value: '',
        label: services.length > 0 ? t('dashboard.select.service') : t('dashboard.select.noServices'),
        disabled: services.length > 0,
      },
      ...services.map((service) => ({
        value: service.id,
        label: service.name,
      })),
    ],
    [services, t],
  )
  const studioOptions = useMemo<OndaSelectOption[]>(
    () =>
      selectedService?.requires_studio
        ? [
            {
              value: '',
              label:
                availableStudios.length > 0
                  ? t('dashboard.select.studio')
                  : t('dashboard.calendar.noStudiosForService'),
              disabled: true,
            },
            ...availableStudios.map((studio) => ({ value: studio.id, label: studio.name })),
          ]
        : [{ value: '', label: t('dashboard.notApplicable') }],
    [availableStudios, selectedService?.requires_studio, t],
  )
  const producerOptions = useMemo<OndaSelectOption[]>(
    () =>
      selectedService?.requires_producer
        ? [
            {
              value: '',
              label:
                availableProducers.length > 0
                  ? t('dashboard.select.producer')
                  : t('dashboard.calendar.noProducersForSelection'),
              disabled: true,
            },
            ...availableProducers.map((producer) => ({ value: producer.id, label: producer.name })),
          ]
        : [{ value: '', label: t('dashboard.notApplicable') }],
    [availableProducers, selectedService?.requires_producer, t],
  )
  const selectionReady = useMemo(
    () =>
      isBookingSelectionReady(services, {
        serviceId: selection.serviceId,
        studioId: selection.studioId || null,
        producerId: selection.producerId || null,
      },
      { producers, studios },
    ),
    [producers, selection.producerId, selection.serviceId, selection.studioId, services, studios],
  )

  function saveSelectionDraft(
    nextSelection: CalendarSelection,
    nextDateKey: string,
    nextSlots: AvailabilitySlot[],
  ) {
    saveBookingDraft({
      booking_date: nextDateKey,
      producer_id: nextSelection.producerId || null,
      selected_slots: nextSlots.map((slot) => ({
        endTime: slot.endTime,
        startTime: slot.startTime,
      })),
      service_id: nextSelection.serviceId,
      studio_id: nextSelection.studioId || null,
    })
  }

  useEffect(() => {
    setSelection((currentSelection) => {
      const currentService = getServiceById(services, currentSelection.serviceId)
      const nextService =
        currentService && serviceCanBeBooked(currentService, studios, producers)
          ? currentService
          : getFirstBookableService(services, studios, producers)

      if (!nextService) return emptySelection

      const nextStudios = getStudiosForService(nextService, studios, producers)
      const nextStudioId = nextService.requires_studio
        ? nextStudios.some((studio) => studio.id === currentSelection.studioId)
          ? currentSelection.studioId
          : nextStudios[0]?.id ?? ''
        : ''
      const nextProducers = getProducersForServiceAndStudio(nextService, nextStudioId || null, producers)
      const nextProducerId = nextService.requires_producer
        ? nextProducers.some((producer) => producer.id === currentSelection.producerId)
          ? currentSelection.producerId
          : nextProducers[0]?.id ?? ''
        : ''

      const nextSelection = {
        serviceId: nextService.id,
        studioId: nextStudioId,
        producerId: nextProducerId,
      }

      if (
        currentSelection.serviceId === nextSelection.serviceId &&
        currentSelection.studioId === nextSelection.studioId &&
        currentSelection.producerId === nextSelection.producerId
      ) {
        return currentSelection
      }

      return nextSelection
    })
  }, [producers, services, studios])

  useEffect(() => {
    if (restoredDraftRef.current || services.length === 0) return

    const draft = readBookingDraft()
    restoredDraftRef.current = true

    if (!draft) return

    const draftSelection = {
      serviceId: draft.service_id,
      studioId: draft.studio_id ?? '',
      producerId: draft.producer_id ?? '',
    }

    if (
      !isBookingSelectionReady(
        services,
        {
          serviceId: draftSelection.serviceId,
          studioId: draftSelection.studioId || null,
          producerId: draftSelection.producerId || null,
        },
        { producers, studios },
      )
    ) {
      return
    }

    setSelection(draftSelection)
    setSelectedSlots(
      draft.selected_slots.map((slot) => ({
        endTime: normalizeTime(slot.endTime),
        source: 'rule',
        startTime: normalizeTime(slot.startTime),
      })),
    )

    if (draft.booking_date) {
      onDateChange(new Date(`${draft.booking_date}T00:00:00`))
    }
  }, [onDateChange, producers, services, studios])

  useEffect(() => {
    if (!selectionReady) {
      setBookedSlots([])
      setSlotsError(null)
      return undefined
    }

    let active = true
    setLoadingSlots(true)
    setSlotsError(null)

    fetchBookedSlots({
      bookingDate: selectedDateKey,
      serviceId: selection.serviceId,
      studioId: selection.studioId || null,
      producerId: selection.producerId || null,
    })
      .then((slots) => {
        if (!active) return
        setBookedSlots(
          slots.map((slot) => ({
            startTime: slot.start_time,
            endTime: slot.end_time,
            source: 'rule',
          })),
        )
      })
      .catch((error) => {
        if (!active) return
        setBookedSlots([])
        setSlotsError(error instanceof Error ? error.message : t('dashboard.calendar.bookedSlotsError'))
      })
      .finally(() => {
        if (active) setLoadingSlots(false)
      })

    return () => {
      active = false
    }
  }, [bookings, selectedDateKey, selection.producerId, selection.serviceId, selection.studioId, selectionReady, t])

  const availableSlots = useMemo(() => {
    if (!selectionReady) return []

    return buildAvailableSlots({
      bookedSlots: bookedSlots.map((slot) => ({
        start_time: slot.startTime,
        end_time: slot.endTime,
        status: 'pending',
      })),
      date: selectedDate,
      exceptions: availabilityExceptions,
      producerId: selection.producerId || null,
      producers,
      rules: availabilityRules,
      serviceId: selection.serviceId,
      services,
      studioId: selection.studioId || null,
      studios,
    })
  }, [
    availabilityExceptions,
    availabilityRules,
    bookedSlots,
    producers,
    selectedDate,
    selection.producerId,
    selection.serviceId,
    selection.studioId,
    selectionReady,
    services,
    studios,
  ])
  const sortedAvailableSlots = useMemo(
    () => [...availableSlots].sort((left, right) => minutesFromTime(left.startTime) - minutesFromTime(right.startTime)),
    [availableSlots],
  )
  const selectedRangeStart = selectedSlots[0]?.startTime ?? ''
  const selectedRangeEnd = selectedSlots[selectedSlots.length - 1]?.endTime ?? ''
  const selectedTotalMinutes = selectedRangeStart && selectedRangeEnd
    ? minutesFromTime(selectedRangeEnd) - minutesFromTime(selectedRangeStart)
    : 0
  const selectedTotalHours = selectedTotalMinutes > 0 ? selectedTotalMinutes / 60 : 0
  const selectedTotalAmount = (selectedService?.price_per_slot ?? 0) * selectedSlots.length
  const selectedDepositAmount = Math.round((selectedTotalAmount * (selectedService?.deposit_percent ?? 50)) / 100)

  const availableDateKeys = useMemo(() => {
    if (!selectionReady) return new Set<string>()

    return getAvailableDateKeys({
      days: 90,
      exceptions: availabilityExceptions,
      producerId: selection.producerId || null,
      producers,
      rules: availabilityRules,
      serviceId: selection.serviceId,
      services,
      studioId: selection.studioId || null,
      studios,
    })
  }, [
    availabilityExceptions,
    availabilityRules,
    producers,
    selection.producerId,
    selection.serviceId,
    selection.studioId,
    selectionReady,
    services,
    studios,
  ])

  const handleCalendarChange = (date: Date) => {
    const nextDateKey = toDateKey(date)
    onDateChange(date)
    setSelectedSlots([])
    saveSelectionDraft(selection, nextDateKey, [])
  }

  const handleServiceChange = (serviceId: string) => {
    const nextService = getServiceById(services, serviceId)
    const nextStudios = getStudiosForService(nextService, studios, producers)
    const nextStudioId = nextService?.requires_studio ? nextStudios[0]?.id ?? '' : ''
    const nextProducers = getProducersForServiceAndStudio(nextService, nextStudioId || null, producers)

    const nextSelection = {
      serviceId,
      studioId: nextStudioId,
      producerId: nextService?.requires_producer ? nextProducers[0]?.id ?? '' : '',
    }

    setSelection(nextSelection)
    setSelectedSlots([])
    setSlotsError(null)
    setSelectionNotice(null)
    saveSelectionDraft(nextSelection, selectedDateKey, [])
  }

  const handleStudioChange = (studioId: string) => {
    const nextProducers = getProducersForServiceAndStudio(selectedService, studioId || null, producers)

    setSelection((current) => {
      const nextSelection = {
        ...current,
        producerId: selectedService?.requires_producer
          ? nextProducers.some((producer) => producer.id === current.producerId)
            ? current.producerId
            : nextProducers[0]?.id ?? ''
          : '',
        studioId,
      }

      setSelectedSlots([])
      setSlotsError(null)
      setSelectionNotice(null)
      saveSelectionDraft(nextSelection, selectedDateKey, [])

      return nextSelection
    })
  }

  const handleProducerChange = (producerId: string) => {
    const nextSelection = { ...selection, producerId }

    setSelection(nextSelection)
    setSelectedSlots([])
    setSlotsError(null)
    setSelectionNotice(null)
    saveSelectionDraft(nextSelection, selectedDateKey, [])
  }

  const handleSlotClick = (slot: AvailabilitySlot) => {
    setSelectionNotice(null)

    let nextSlots = [slot]

    if (selectedSlots.length > 0) {
      const currentStartIndex = sortedAvailableSlots.findIndex(
        (availableSlot) => availableSlot.startTime === selectedSlots[0]?.startTime,
      )
      const nextIndex = sortedAvailableSlots.findIndex((availableSlot) => availableSlot.startTime === slot.startTime)

      if (currentStartIndex >= 0 && nextIndex >= 0) {
        const startIndex = Math.min(currentStartIndex, nextIndex)
        const endIndex = Math.max(currentStartIndex, nextIndex)
        const range = sortedAvailableSlots.slice(startIndex, endIndex + 1)
        const continuousRange = getContinuousSlotRange(range)

        if (continuousRange.length === 0) {
          setSelectionNotice(t('booking.error.nonContinuousSlots'))
          return
        }

        nextSlots = continuousRange
      }
    }

    setSelectedSlots(nextSlots)
    saveSelectionDraft(selection, selectedDateKey, nextSlots)
  }

  useEffect(() => {
    if (!selectionReady || loadingSlots || selectedSlots.length === 0) return

    const availableSlotKeys = new Set(sortedAvailableSlots.map(slotKey))
    const validSlots = selectedSlots.filter((slot) => availableSlotKeys.has(slotKey(slot)))

    if (validSlots.length === selectedSlots.length) return

    const continuousSlots = getContinuousSlotRange(validSlots)

    setSelectedSlots(continuousSlots)
    setSelectionNotice(t('booking.error.slotUnavailable'))
    saveSelectionDraft(selection, selectedDateKey, continuousSlots)
  }, [loadingSlots, selectedDateKey, selectedSlots, selection, selectionReady, sortedAvailableSlots, t])

  const openSlot = () => {
    if (selectedSlots.length === 0) {
      setSelectionNotice(t('booking.error.incompleteSelection'))
      return
    }

    onOpenBookingModal({
      bookingDate: selectedDateKey,
      producerId: selection.producerId || null,
      serviceId: selection.serviceId || null,
      endTime: selectedRangeEnd,
      selectedSlots: selectedSlots.map((slot) => ({
        endTime: slot.endTime,
        startTime: slot.startTime,
      })),
      startTime: selectedRangeStart,
      studioId: selection.studioId || null,
    })
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
      <div className="glass-panel rounded-lg bg-white/70 p-4 sm:p-6 dark:bg-onda-black/48">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-onda-lavender">
              {t('dashboard.calendar.eyebrow')}
            </p>
            <h2 className="mt-2 font-display text-xl font-bold uppercase tracking-[0.08em] text-zinc-950 dark:text-white">
              {dateFormatter.format(selectedDate)}
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-onda-muted">
              {t(getServiceResourceHint(selectedService))}
            </p>
          </div>

          <button
            type="button"
            onClick={() => openSlot()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-onda-purple px-4 py-3 font-display text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:-translate-y-0.5 hover:bg-onda-electric disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            disabled={!canBook || !selectionReady || selectedSlots.length === 0}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('dashboard.calendar.book')}
          </button>
        </div>

        <div className="mb-5 grid min-w-0 gap-3 rounded-lg border border-onda-purple/10 bg-white/55 p-3 shadow-inner shadow-white/40 md:grid-cols-2 xl:grid-cols-3 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
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
            disabled={!selectedService?.requires_studio || availableStudios.length === 0}
          />

          <OndaSelect
            label={t('dashboard.producer')}
            value={selection.producerId}
            onChange={handleProducerChange}
            options={producerOptions}
            disabled={!selectedService?.requires_producer || availableProducers.length === 0}
          />
        </div>

        {resourceUnavailableMessage ? (
          <div className="mb-5 rounded-md border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-700 dark:text-amber-100">
            {resourceUnavailableMessage}
          </div>
        ) : null}

        <AvailabilityCalendar
          availableDateKeys={selectionReady ? availableDateKeys : new Set<string>()}
          bookingDateKeys={bookingDates}
          language={language}
          minDate={getStartOfToday()}
          onDateChange={handleCalendarChange}
          selectedDate={selectedDate}
        />
      </div>

      <aside className="glass-panel rounded-lg bg-white/70 p-4 sm:p-6 dark:bg-onda-black/48">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-onda-lavender">
              {t('dashboard.availableTimes')}
            </p>
            <h2 className="mt-2 font-display text-lg font-bold uppercase tracking-[0.08em] text-zinc-950 dark:text-white">
              {availableSlots.length > 0
                ? `${availableSlots.length} ${
                    availableSlots.length === 1 ? t('dashboard.blockSingular') : t('dashboard.blockPlural')
                  }`
                : t('dashboard.agenda')}
            </h2>
          </div>
          <SlidersHorizontal className="h-5 w-5 text-onda-lavender" aria-hidden="true" />
        </div>

        {!canBook ? (
          <div className="rounded-lg border border-dashed border-amber-400/30 bg-amber-500/10 p-5 text-sm leading-7 text-amber-100">
            {t('dashboard.calendar.emptySetup')}
          </div>
        ) : resourceUnavailableMessage ? (
          <div className="rounded-lg border border-dashed border-onda-lavender/25 p-5 text-sm leading-7 text-onda-muted">
            {resourceUnavailableMessage}
          </div>
        ) : !selectionReady ? (
          <div className="rounded-lg border border-dashed border-onda-lavender/25 p-5 text-sm leading-7 text-onda-muted">
            {t('dashboard.calendar.chooseResources')}
          </div>
        ) : loadingSlots ? (
          <div className="flex min-h-24 items-center justify-center rounded-md border border-dashed border-onda-lavender/25 text-sm font-semibold text-onda-muted">
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-onda-lavender" aria-hidden="true" />
            {t('dashboard.calendar.loadingAvailability')}
          </div>
        ) : slotsError ? (
          <div className="rounded-md border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-100">
            {slotsError}
          </div>
        ) : availableSlots.length === 0 ? (
          <div className="rounded-lg border border-dashed border-onda-lavender/25 p-5 text-sm leading-7 text-onda-muted">
            {t('dashboard.calendar.noSlots')}
          </div>
        ) : (
          <div className="grid gap-4">
            {selectionNotice ? (
              <div className="rounded-md border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-700 dark:text-amber-100">
                {selectionNotice}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {sortedAvailableSlots.map((slot) => {
                const selected = selectedSlots.some((selectedSlot) => selectedSlot.startTime === slot.startTime)

                return (
                  <button
                    key={`${slot.startTime}-${slot.endTime}`}
                    type="button"
                    onClick={() => handleSlotClick(slot)}
                    className={cn(
                      'min-h-12 rounded-md border px-3 py-2 text-sm font-bold transition hover:-translate-y-0.5',
                      selected
                        ? 'border-onda-lavender bg-onda-purple text-white shadow-[0_0_18px_rgba(168,85,247,0.38)]'
                        : 'border-onda-purple/20 bg-white/75 text-zinc-950 hover:border-onda-purple hover:bg-onda-purple/10 dark:border-onda-lavender/25 dark:bg-white/[0.06] dark:text-white dark:hover:border-onda-lavender dark:hover:bg-onda-purple/25',
                    )}
                  >
                    {slot.startTime}
                    <span className="block text-[0.65rem] font-semibold text-onda-muted">{slot.endTime}</span>
                  </button>
                )
              })}
            </div>

            {selectedSlots.length > 0 && selectedService ? (
              <div className="rounded-md border border-onda-lavender/18 bg-white/[0.04] p-4 text-sm leading-6 text-onda-muted">
                <div className="grid gap-1">
                  <p className="font-semibold text-zinc-950 dark:text-white">
                    {selectedRangeStart} - {selectedRangeEnd}
                  </p>
                  <p>{t('booking.price.slots')}: {selectedSlots.length}</p>
                  <p>{t('booking.price.duration')}: {selectedTotalHours.toFixed(selectedTotalHours % 1 === 0 ? 0 : 1)} h</p>
                  <p>
                    {t('booking.total')}: {formatMoney(selectedTotalAmount, selectedService.currency, language === 'en' ? 'en-US' : 'es-CL')}
                  </p>
                  <p>
                    {t('booking.depositRequired')}: {formatMoney(selectedDepositAmount, selectedService.currency, language === 'en' ? 'en-US' : 'es-CL')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openSlot()}
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-onda-purple px-4 py-3 font-display text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-onda-electric"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {t('dashboard.calendar.book')}
                </button>
              </div>
            ) : null}
          </div>
        )}

        <div className="mt-7 border-t border-white/10 pt-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-onda-lavender">
                {t('dashboard.selectedDay')}
              </p>
              <h2 className="mt-2 font-display text-lg font-bold uppercase tracking-[0.08em] text-zinc-950 dark:text-white">
                {bookings.length} {bookings.length === 1 ? t('dashboard.bookingSingular') : t('dashboard.bookingPlural')}
              </h2>
            </div>
            <Clock className="h-5 w-5 text-onda-lavender" aria-hidden="true" />
          </div>

          {bookings.length === 0 ? (
            <div className="rounded-lg border border-dashed border-onda-lavender/25 p-5 text-sm leading-7 text-onda-muted">
              {t('dashboard.calendar.noBookingsForDate')}
            </div>
          ) : (
            <div className="grid gap-3">
              {bookings.map((booking) => {
                const currency = booking.currency ?? 'CLP'
                const locale = language === 'en' ? 'en-US' : 'es-CL'
                const depositBase = booking.deposit_amount_before_discount ?? booking.deposit_amount ?? 0
                const balanceDue = Math.max(Number(booking.total_amount ?? 0) - Number(depositBase), 0)
                const canCancel = booking.status === 'pending' || booking.status === 'confirmed'
                const isCancelling = cancellingBookingId === booking.id

                return (
                  <article
                    key={booking.id}
                    className="rounded-lg border border-onda-lavender/18 bg-white/[0.05] p-4 transition duration-300 hover:border-onda-lavender/35"
                  >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-sm font-bold uppercase tracking-[0.12em] text-zinc-950 dark:text-white">
                        {booking.service_name}
                      </h3>
                      <p className="mt-2 text-sm font-semibold text-onda-muted">
                        {normalizeTime(booking.start_time)} - {normalizeTime(booking.end_time)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'rounded-md border px-2.5 py-1 text-xs font-bold uppercase tracking-[0.08em]',
                        statusClassName(booking.status),
                      )}
                    >
                      {t(`dashboard.status.${booking.status}`)}
                    </span>
                  </div>

                    <div className="mt-3 grid gap-2 text-sm text-onda-muted">
                      <p>{t('dashboard.studio')}: {booking.studio_name ?? t('dashboard.notApplicable')}</p>
                      <p>{t('dashboard.producer')}: {booking.producer_name ?? t('dashboard.toConfirm')}</p>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={cn(
                            'rounded-md border px-2.5 py-1 text-xs font-bold uppercase tracking-[0.08em]',
                            paymentStatusClassName(booking.payment_status),
                          )}
                        >
                          {t(`dashboard.paymentStatus.${booking.payment_status ?? 'unpaid'}`)}
                        </span>
                      </div>
                      {booking.total_amount !== null ? (
                        <p>{t('booking.total')}: {formatMoney(booking.total_amount, currency, locale)}</p>
                      ) : null}
                      {booking.deposit_amount !== null ? (
                        <p>{t('booking.depositRequired')}: {formatMoney(booking.deposit_amount, currency, locale)}</p>
                      ) : null}
                      {booking.discount_amount ? (
                        <p>
                          {t('booking.discountAppliedAmount')}: {formatMoney(booking.discount_amount, currency, locale)}
                          {booking.discount_code ? ` (${booking.discount_code})` : ''}
                        </p>
                      ) : null}
                      {booking.deposit_amount_due !== null ? (
                        <p>{t('booking.depositDue')}: {formatMoney(booking.deposit_amount_due, currency, locale)}</p>
                      ) : null}
                      {booking.total_amount !== null ? (
                        <p>{t('dashboard.balanceDue')}: {formatMoney(balanceDue, currency, locale)}</p>
                      ) : null}
                      {booking.payment_reference ? (
                        <p className="break-all">{t('dashboard.paymentReference')}: {booking.payment_reference}</p>
                      ) : null}
                      {booking.payment_validation_code ? (
                        <p>{t('dashboard.paymentValidationCode')}: {booking.payment_validation_code}</p>
                      ) : null}
                      {booking.notes ? <p>{t('dashboard.notes')}: {booking.notes}</p> : null}
                    </div>
                    {canCancel ? (
                      <button
                        type="button"
                        onClick={() => void onCancelBooking(booking)}
                        disabled={isCancelling}
                        className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-red-400/35 px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-red-700 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-100"
                      >
                        {isCancelling ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <XCircle className="h-4 w-4" aria-hidden="true" />
                        )}
                        {t('dashboard.cancelBooking')}
                      </button>
                    ) : null}
                  </article>
                )
              })}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-md border border-onda-lavender/18 bg-white/[0.04] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-onda-muted">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          {t('dashboard.calendar.legend')}
        </div>
      </aside>
    </div>
  )
}
