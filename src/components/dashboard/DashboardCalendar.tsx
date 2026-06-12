import { useEffect, useMemo, useState } from 'react'
import Calendar from 'react-calendar'
import type { Value } from 'react-calendar/dist/shared/types.js'
import { CalendarDays, Clock, Loader2, Plus, SlidersHorizontal } from 'lucide-react'
import type { BookingModalInitialSelection } from './StudioBookingModal'
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
  getServiceById,
  getStartOfToday,
  isBookingSelectionReady,
  normalizeTime,
  statusClassName,
  toDateKey,
} from '../../lib/dashboard'
import { cn } from '../../lib/utils'

interface DashboardCalendarProps {
  availabilityExceptions: AvailabilityException[]
  availabilityRules: AvailabilityRule[]
  bookingDates: Set<string>
  canBook: boolean
  bookings: Booking[]
  producers: Producer[]
  selectedDate: Date
  services: BookingService[]
  studios: Studio[]
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
  canBook,
  producers,
  selectedDate,
  services,
  studios,
  onDateChange,
  onOpenBookingModal,
}: DashboardCalendarProps) {
  const { language, t } = useI18n()
  const [selection, setSelection] = useState<CalendarSelection>(emptySelection)
  const [bookedSlots, setBookedSlots] = useState<AvailabilitySlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotsError, setSlotsError] = useState<string | null>(null)

  const selectedDateKey = toDateKey(selectedDate)
  const selectedService = useMemo(() => getServiceById(services, selection.serviceId), [selection.serviceId, services])
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
            { value: '', label: t('dashboard.select.studio'), disabled: true },
            ...studios.map((studio) => ({ value: studio.id, label: studio.name })),
          ]
        : [{ value: '', label: t('dashboard.notApplicable') }],
    [selectedService?.requires_studio, studios, t],
  )
  const producerOptions = useMemo<OndaSelectOption[]>(
    () =>
      selectedService?.requires_producer
        ? [
            { value: '', label: t('dashboard.select.producer'), disabled: true },
            ...producers.map((producer) => ({ value: producer.id, label: producer.name })),
          ]
        : [{ value: '', label: t('dashboard.notApplicable') }],
    [producers, selectedService?.requires_producer, t],
  )
  const selectionReady = useMemo(
    () =>
      isBookingSelectionReady(services, {
        serviceId: selection.serviceId,
        studioId: selection.studioId || null,
        producerId: selection.producerId || null,
      }),
    [selection.producerId, selection.serviceId, selection.studioId, services],
  )

  useEffect(() => {
    setSelection((currentSelection) => {
      const currentService = getServiceById(services, currentSelection.serviceId)
      const nextService =
        currentService && services.some((service) => service.id === currentService.id)
          ? currentService
          : getFirstBookableService(services, studios, producers)

      if (!nextService) return emptySelection

      const nextStudioId = nextService.requires_studio
        ? studios.some((studio) => studio.id === currentSelection.studioId)
          ? currentSelection.studioId
          : studios[0]?.id ?? ''
        : ''
      const nextProducerId = nextService.requires_producer
        ? producers.some((producer) => producer.id === currentSelection.producerId)
          ? currentSelection.producerId
          : producers[0]?.id ?? ''
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
      rules: availabilityRules,
      serviceId: selection.serviceId,
      services,
      studioId: selection.studioId || null,
    })
  }, [
    availabilityExceptions,
    availabilityRules,
    bookedSlots,
    selectedDate,
    selection.producerId,
    selection.serviceId,
    selection.studioId,
    selectionReady,
    services,
  ])

  const availableDateKeys = useMemo(() => {
    if (!selectionReady) return new Set<string>()

    return getAvailableDateKeys({
      days: 90,
      exceptions: availabilityExceptions,
      producerId: selection.producerId || null,
      rules: availabilityRules,
      serviceId: selection.serviceId,
      services,
      studioId: selection.studioId || null,
    })
  }, [
    availabilityExceptions,
    availabilityRules,
    selection.producerId,
    selection.serviceId,
    selection.studioId,
    selectionReady,
    services,
  ])

  const handleCalendarChange = (value: Value) => {
    if (value instanceof Date) {
      onDateChange(value)
      return
    }

    if (Array.isArray(value) && value[0] instanceof Date) {
      onDateChange(value[0])
    }
  }

  const handleServiceChange = (serviceId: string) => {
    const nextService = getServiceById(services, serviceId)

    setSelection({
      serviceId,
      studioId: nextService?.requires_studio ? studios[0]?.id ?? '' : '',
      producerId: nextService?.requires_producer ? producers[0]?.id ?? '' : '',
    })
  }

  const openSlot = (slot?: AvailabilitySlot) => {
    onOpenBookingModal({
      bookingDate: selectedDateKey,
      producerId: selection.producerId || null,
      serviceId: selection.serviceId || null,
      startTime: slot?.startTime ?? null,
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
            disabled={!canBook}
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
            onChange={(studioId) => setSelection((current) => ({ ...current, studioId }))}
            options={studioOptions}
            disabled={!selectedService?.requires_studio}
          />

          <OndaSelect
            label={t('dashboard.producer')}
            value={selection.producerId}
            onChange={(producerId) => setSelection((current) => ({ ...current, producerId }))}
            options={producerOptions}
            disabled={!selectedService?.requires_producer}
          />
        </div>

        <Calendar
          locale={language === 'en' ? 'en-US' : 'es-CL'}
          minDate={getStartOfToday()}
          onChange={handleCalendarChange}
          value={selectedDate}
          tileClassName={({ date, view }) => {
            if (view !== 'month') return null

            const dateKey = toDateKey(date)
            const classNames = []

            if (bookingDates.has(dateKey)) classNames.push('onda-calendar-has-booking')
            if (selectionReady && availableDateKeys.has(dateKey)) classNames.push('onda-calendar-has-availability')
            if (selectionReady && date >= getStartOfToday() && !availableDateKeys.has(dateKey)) {
              classNames.push('onda-calendar-no-availability')
            }

            return classNames.join(' ') || null
          }}
          tileContent={({ date, view }) => {
            if (view !== 'month') return null

            const dateKey = toDateKey(date)
            return (
              <>
                {bookingDates.has(dateKey) ? <span className="onda-calendar-dot" /> : null}
                {selectionReady && availableDateKeys.has(dateKey) ? <span className="onda-calendar-availability-dot" /> : null}
              </>
            )
          }}
          className="onda-calendar"
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
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {availableSlots.map((slot) => (
              <button
                key={`${slot.startTime}-${slot.endTime}`}
                type="button"
                onClick={() => openSlot(slot)}
                className="min-h-12 rounded-md border border-onda-purple/20 bg-white/75 px-3 py-2 text-sm font-bold text-zinc-950 transition hover:-translate-y-0.5 hover:border-onda-purple hover:bg-onda-purple/10 dark:border-onda-lavender/25 dark:bg-white/[0.06] dark:text-white dark:hover:border-onda-lavender dark:hover:bg-onda-purple/25"
              >
                {slot.startTime}
                <span className="block text-[0.65rem] font-semibold text-onda-muted">{slot.endTime}</span>
              </button>
            ))}
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
              {bookings.map((booking) => (
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
                    {booking.notes ? <p>{t('dashboard.notes')}: {booking.notes}</p> : null}
                  </div>
                </article>
              ))}
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
