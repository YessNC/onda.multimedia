import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarDays, FileText, Loader2, LogOut } from 'lucide-react'
import DashboardCalendar from '../components/dashboard/DashboardCalendar'
import CommunityPreferencesSection from '../components/dashboard/CommunityPreferencesSection'
import FilesSection from '../components/dashboard/FilesSection'
import StatsCards from '../components/dashboard/StatsCards'
import StudioBookingModal, { type BookingModalInitialSelection } from '../components/dashboard/StudioBookingModal'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../hooks/useI18n'
import {
  type AvailabilityException,
  type AvailabilityRule,
  type Booking,
  type BookingService,
  type CommunityPreferences,
  type CreateBookingResult,
  type DashboardIssue,
  type DashboardTab,
  type Producer,
  type SharedFile,
  type Studio,
  cancelOwnBooking,
  fetchDashboardData,
  getDashboardStats,
  getStartOfToday,
  serviceCanBeBooked,
  toDateKey,
} from '../lib/dashboard'
import { cn } from '../lib/utils'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<DashboardTab>('calendar')
  const [selectedDate, setSelectedDate] = useState(getStartOfToday)
  const [services, setServices] = useState<BookingService[]>([])
  const [studios, setStudios] = useState<Studio[]>([])
  const [producers, setProducers] = useState<Producer[]>([])
  const [availabilityRules, setAvailabilityRules] = useState<AvailabilityRule[]>([])
  const [availabilityExceptions, setAvailabilityExceptions] = useState<AvailabilityException[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [communityPreferences, setCommunityPreferences] = useState<CommunityPreferences | null>(null)
  const [files, setFiles] = useState<SharedFile[]>([])
  const [issues, setIssues] = useState<DashboardIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [bookingModalOpen, setBookingModalOpen] = useState(false)
  const [bookingInitialSelection, setBookingInitialSelection] = useState<BookingModalInitialSelection | null>(null)
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null)

  const selectedDateKey = toDateKey(selectedDate)

  const loadDashboardData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await fetchDashboardData()
      setServices(data.services)
      setStudios(data.studios)
      setProducers(data.producers)
      setAvailabilityRules(data.availabilityRules)
      setAvailabilityExceptions(data.availabilityExceptions)
      setBookings(data.bookings)
      setCommunityPreferences(data.communityPreferences)
      setFiles(data.files)
      setIssues(data.issues)
    } catch (dashboardError) {
      setError(dashboardError instanceof Error ? dashboardError.message : t('dashboard.error.load'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDashboardData()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadDashboardData])

  const stats = useMemo(() => {
    const statLabels: Record<string, string> = {
      'Proximas reservas': t('dashboard.stats.nextBookings'),
      'Archivos recibidos': t('dashboard.stats.receivedFiles'),
      'Servicios activos': t('dashboard.stats.activeServices'),
    }

    return getDashboardStats(bookings, files, services).map((stat) => ({
      ...stat,
      label: statLabels[stat.label] ?? stat.label,
    }))
  }, [bookings, files, services, t])

  const bookingDates = useMemo(() => {
    return new Set(bookings.map((booking) => booking.booking_date))
  }, [bookings])

  const selectedDateBookings = useMemo(() => {
    return bookings.filter((booking) => booking.booking_date === selectedDateKey)
  }, [bookings, selectedDateKey])

  const canBook = useMemo(
    () => services.some((service) => serviceCanBeBooked(service, studios, producers)),
    [producers, services, studios],
  )
  const issueSectionLabels: Record<string, string> = {
    Archivos: t('dashboard.issue.files'),
    'Asignaciones servicio-equipo': t('dashboard.issue.producers'),
    'Asignaciones servicio-estudio': t('dashboard.issue.studios'),
    'Asignaciones estudio-equipo': t('dashboard.issue.producers'),
    'Disponibilidad semanal': t('dashboard.issue.weeklyAvailability'),
    'Excepciones de disponibilidad': t('dashboard.issue.availabilityExceptions'),
    Equipo: t('dashboard.issue.producers'),
    'Preferencias comunidad': t('dashboard.issue.communityPreferences'),
    Productores: t('dashboard.issue.producers'),
    Reservas: t('dashboard.issue.bookings'),
    Servicios: t('dashboard.issue.services'),
    Estudios: t('dashboard.issue.studios'),
  }

  const openBookingModal = useCallback(
    (initialSelection?: BookingModalInitialSelection) => {
      setSuccessMessage(null)
      setBookingInitialSelection(initialSelection ?? { bookingDate: selectedDateKey })
      setBookingModalOpen(true)
    },
    [selectedDateKey],
  )

  const handleBookingCreated = useCallback(async (result: CreateBookingResult) => {
    await loadDashboardData()
    setSuccessMessage(
      result.payment_status === 'pending' && result.deposit_amount_due > 0
        ? t('booking.paymentHoldCreated')
        : t('booking.successCreated'),
    )
  }, [loadDashboardData, t])

  const handleCancelBooking = useCallback(
    async (booking: Booking) => {
      if (!window.confirm(t('dashboard.cancelBookingConfirm'))) return

      setCancellingBookingId(booking.id)
      setError(null)
      setSuccessMessage(null)

      try {
        await cancelOwnBooking(booking.id)
        await loadDashboardData()
        setSuccessMessage(t('dashboard.cancelBookingSuccess'))
      } catch {
        setError(t('dashboard.cancelBookingError'))
      } finally {
        setCancellingBookingId(null)
      }
    },
    [loadDashboardData, t],
  )

  return (
    <section className="min-h-[calc(100vh-5rem)] bg-white py-8 text-zinc-950 sm:py-12 dark:bg-onda-night dark:text-onda-soft">
      <div className="onda-container">
        <div className="flex flex-col gap-5 border-b border-onda-lavender/15 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="font-display text-xs font-bold uppercase tracking-[0.22em] text-onda-lavender">
              {t('dashboard.eyebrow')}
            </p>
            <h1 className="mt-2 font-display text-3xl font-extrabold uppercase tracking-[0.08em] text-zinc-950 dark:text-white">
              {t('dashboard.title')}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-onda-muted">
              {t('dashboard.welcome').replace('{name}', user?.full_name ?? t('dashboard.clientFallback'))}
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-md border border-red-400/35 bg-red-500/10 px-4 py-3 font-display text-xs font-bold uppercase tracking-[0.12em] text-red-100 transition hover:-translate-y-0.5 hover:bg-red-500 hover:text-white"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {t('dashboard.logout')}
          </button>
        </div>

        <StatsCards stats={stats} />

        <CommunityPreferencesSection
          fallbackEmail={user?.email}
          preferences={communityPreferences}
          onError={(message) => {
            setSuccessMessage(null)
            setError(message)
          }}
          onSuccess={(message) => {
            setError(null)
            setSuccessMessage(message)
          }}
          onUpdated={setCommunityPreferences}
        />

        <div className="mt-6 flex flex-col gap-3 rounded-lg border border-onda-purple/15 bg-white/70 p-2 shadow-[0_0_28px_rgba(123,44,255,0.12)] sm:w-fit sm:flex-row dark:border-onda-lavender/15 dark:bg-white/[0.04]">
          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={cn(
              'inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-3 font-display text-xs font-bold uppercase tracking-[0.12em] transition',
              activeTab === 'calendar'
                ? 'bg-onda-purple text-white shadow-[0_0_24px_rgba(123,44,255,0.38)]'
                : 'text-onda-soft hover:bg-onda-purple/10',
            )}
          >
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            {t('dashboard.tabs.calendar')}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={cn(
              'inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-3 font-display text-xs font-bold uppercase tracking-[0.12em] transition',
              activeTab === 'files'
                ? 'bg-onda-purple text-white shadow-[0_0_24px_rgba(123,44,255,0.38)]'
                : 'text-onda-soft hover:bg-onda-purple/10',
            )}
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            {t('dashboard.tabs.files')}
          </button>
        </div>

        {issues.length > 0 ? (
          <div className="mt-6 rounded-md border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-100">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>
                {t('dashboard.issuesPrefix')}{' '}
                {issues.map((issue) => issueSectionLabels[issue.section] ?? issue.section).join(', ')}.
              </p>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-6 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-100">
            {successMessage}
          </div>
        ) : null}

        {loading ? (
          <div className="glass-panel mt-8 flex min-h-64 items-center justify-center rounded-lg p-8 text-sm font-semibold text-onda-muted">
            <Loader2 className="mr-3 h-5 w-5 animate-spin text-onda-lavender" aria-hidden="true" />
            {t('dashboard.loading')}
          </div>
        ) : null}

        {!loading && activeTab === 'calendar' ? (
          <DashboardCalendar
            availabilityExceptions={availabilityExceptions}
            availabilityRules={availabilityRules}
            bookingDates={bookingDates}
            bookings={selectedDateBookings}
            cancellingBookingId={cancellingBookingId}
            canBook={canBook}
            producers={producers}
            selectedDate={selectedDate}
            services={services}
            studios={studios}
            onDateChange={setSelectedDate}
            onCancelBooking={handleCancelBooking}
            onOpenBookingModal={openBookingModal}
          />
        ) : null}

        {!loading && activeTab === 'files' ? (
          <FilesSection files={files} onError={setError} />
        ) : null}
      </div>

      {user ? (
        <StudioBookingModal
          availabilityExceptions={availabilityExceptions}
          availabilityRules={availabilityRules}
          clientEmail={user.email}
          clientId={user.id}
          clientName={user.full_name}
          clientPhone={user.phone ?? null}
          initialSelection={bookingInitialSelection}
          open={bookingModalOpen}
          producers={producers}
          selectedDate={selectedDate}
          services={services}
          studios={studios}
          onBookingCreated={handleBookingCreated}
          onClose={() => setBookingModalOpen(false)}
        />
      ) : null}
    </section>
  )
}
