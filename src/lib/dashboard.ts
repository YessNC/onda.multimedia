import { CalendarDays, HardDrive, Sparkles } from 'lucide-react'
import { supabase } from './supabaseClient'

export type DashboardTab = 'calendar' | 'files'
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'
export type LegacyServiceType = 'recording' | 'mixing' | 'mastering' | 'production'
export type FileType =
  | 'master'
  | 'stem'
  | 'demo'
  | 'mix'
  | 'premix'
  | 'beat'
  | 'session'
  | 'reference'
  | 'final'
  | 'revision'
  | 'photo'
  | 'video'
  | 'reel'
  | 'editable'
  | 'other'
export type FileFilter = FileType | 'all'
export type AvailabilityExceptionType = 'blocked' | 'available'

export interface Studio {
  id: string
  name: string
  slug: string | null
  description: string | null
  is_active: boolean
}

export interface Producer {
  id: string
  name: string
  specialty: string | null
  role: string | null
  role_description: string | null
  user_id: string | null
  is_active: boolean
}

export interface BookingService {
  id: string
  name: string
  description: string | null
  duration_minutes: number
  requires_studio: boolean
  requires_producer: boolean
  is_active: boolean
}

export interface AvailabilityRule {
  id: string
  group_id: string | null
  service_id: string | null
  studio_id: string | null
  producer_id: string | null
  weekday: number
  weekdays: number[] | null
  start_time: string
  end_time: string
  slot_minutes: number
  is_active: boolean
}

export interface AvailabilityException {
  id: string
  group_id: string | null
  service_id: string | null
  studio_id: string | null
  producer_id: string | null
  exception_date: string
  date_from: string
  date_to: string | null
  weekdays: number[] | null
  start_time: string | null
  end_time: string | null
  type: AvailabilityExceptionType
  reason: string | null
}

export interface Booking {
  id: string
  client_id: string | null
  service_id: string | null
  studio_id: string | null
  producer_id: string | null
  booking_date: string
  start_time: string
  end_time: string
  status: BookingStatus
  notes: string | null
  client_name?: string | null
  service_name: string
  studio_name: string | null
  producer_name: string | null
}

export interface SharedFile {
  id: string
  file_name: string
  file_type: string
  size_bytes: number
  uploaded_at: string
  project_name: string | null
  bucket: string
  storage_path: string
}

export interface BookedSlot {
  start_time: string
  end_time: string
  status: BookingStatus
}

export interface AvailabilitySlot {
  startTime: string
  endTime: string
  source: 'rule' | 'exception'
}

export interface PublicAvailabilityPreviewSlot {
  booking_date: string
  start_time: string
  end_time: string
  service_id: string
  service_name: string
  studio_id: string | null
  studio_name: string | null
  producer_id: string | null
  producer_name: string | null
  source: 'rule' | 'exception'
}

export interface DashboardIssue {
  section: string
  message: string
}

export interface DashboardData {
  services: BookingService[]
  studios: Studio[]
  producers: Producer[]
  availabilityRules: AvailabilityRule[]
  availabilityExceptions: AvailabilityException[]
  bookings: Booking[]
  files: SharedFile[]
  issues: DashboardIssue[]
}

export interface BookingSelection {
  serviceId: string
  studioId?: string | null
  producerId?: string | null
}

export interface BuildAvailableSlotsInput extends BookingSelection {
  services: BookingService[]
  rules: AvailabilityRule[]
  exceptions: AvailabilityException[]
  bookedSlots?: BookedSlot[]
  date: Date | string
  excludePast?: boolean
}

export interface FetchBookedSlotsInput extends BookingSelection {
  bookingDate: string
}

export interface CreateBookingInput extends BookingSelection {
  clientId: string
  bookingDate: string
  startTime: string
  endTime: string
  notes: string | null
}

export interface PublicAvailabilityPreviewInput {
  days?: number
  fromDate?: string
  limit?: number
}

type DashboardError = {
  code?: string
  message?: string
}

type StudioRow = Partial<Studio> & {
  id: string
  name: string
}

type ProducerRow = Partial<Producer> & {
  id: string
  name: string
}

type BookingServiceRow = Partial<BookingService> & {
  id: string
  name: string
}

type AvailabilityRuleRow = Partial<AvailabilityRule> & {
  id: string
  end_time?: string | null
  start_time?: string | null
  weekday?: number | null
}

type AvailabilityExceptionRow = Partial<AvailabilityException> & {
  id: string
  exception_date: string
  type: AvailabilityExceptionType
}

type ModernBookingRow = {
  id: string
  client_id?: string | null
  service_id?: string | null
  studio_id?: string | null
  producer_id?: string | null
  booking_date: string
  start_time: string
  end_time: string | null
  status: string | null
  notes: string | null
}

type LegacyBookingRow = {
  id: string
  studio: string | null
  producer: string | null
  booking_date: string
  booking_time: string
  service_type?: LegacyServiceType | null
  status: string | null
}

type FileRow = Partial<SharedFile> & {
  id: string
  file_name: string
  bucket: string
  storage_path: string
}

type BookedSlotRow = {
  start_time: string
  end_time: string | null
  status: string | null
  service_id?: string | null
  studio_id?: string | null
  producer_id?: string | null
}

type PublicAvailabilityPreviewRow = Omit<PublicAvailabilityPreviewSlot, 'end_time' | 'source' | 'start_time'> & {
  end_time: string | null
  source: string | null
  start_time: string | null
}

const activeBookingStatuses: BookingStatus[] = ['pending', 'confirmed', 'completed']

export const legacyServiceLabels: Record<LegacyServiceType, string> = {
  recording: 'Grabacion',
  mixing: 'Mezcla',
  mastering: 'Master',
  production: 'Produccion',
}

export const fileTypeLabels: Record<FileFilter, string> = {
  all: 'Todos',
  master: 'Master',
  stem: 'Stem',
  demo: 'Demo',
  mix: 'Mix',
  premix: 'Premix',
  beat: 'Beat',
  session: 'Sesion',
  reference: 'Referencia',
  final: 'Final',
  revision: 'Revision',
  photo: 'Foto',
  video: 'Video',
  reel: 'Reel',
  editable: 'Editable',
  other: 'Otro',
}

export const fileFilters: FileFilter[] = [
  'all',
  'master',
  'stem',
  'demo',
  'mix',
  'premix',
  'beat',
  'session',
  'reference',
  'final',
  'revision',
  'photo',
  'video',
  'reel',
  'editable',
  'other',
]

export const dayFormatter = new Intl.DateTimeFormat('es-CL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

export const uploadFormatter = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

function getDashboardError(error: unknown): DashboardError {
  if (typeof error === 'object' && error) return error as DashboardError
  return { message: String(error) }
}

function getErrorMessage(error: unknown) {
  const dashboardError = getDashboardError(error)
  return dashboardError.message ?? dashboardError.code ?? 'Seccion no disponible.'
}

function isMissingOrIncompleteSchema(error: DashboardError | null) {
  if (!error) return false

  const message = error.message?.toLowerCase() ?? ''

  return (
    error.code === '42P01' ||
    error.code === '42703' ||
    error.code === 'PGRST200' ||
    error.code === 'PGRST202' ||
    error.code === 'PGRST204' ||
    error.code === 'PGRST205' ||
    message.includes('could not find the table') ||
    message.includes('could not find a relationship') ||
    message.includes('could not find the function') ||
    message.includes('schema cache') ||
    message.includes('column')
  )
}

function isMissingTableOrFunction(error: DashboardError | null) {
  if (!error) return false

  const message = error.message?.toLowerCase() ?? ''

  return (
    error.code === '42P01' ||
    error.code === 'PGRST202' ||
    error.code === 'PGRST205' ||
    message.includes('could not find the table') ||
    message.includes('could not find the function')
  )
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function normalizeBookingStatus(value: string | null | undefined): BookingStatus {
  if (value === 'confirmed' || value === 'cancelled' || value === 'completed' || value === 'pending') {
    return value
  }

  return 'pending'
}

function normalizeLegacyServiceType(value: string | null | undefined): LegacyServiceType {
  if (value === 'mixing' || value === 'mastering' || value === 'production' || value === 'recording') {
    return value
  }

  return 'recording'
}

export function getStartOfToday() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

export function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateFromKey(dateKey: string) {
  const [year = '0', month = '1', day = '1'] = dateKey.split('-')
  return new Date(Number(year), Number(month) - 1, Number(day))
}

function getWeekdayFromDateKey(dateKey: string) {
  return dateFromKey(dateKey).getDay()
}

function normalizeWeekdays(weekdays: unknown, fallback: number[] = []) {
  const values = Array.isArray(weekdays) ? weekdays : fallback

  return [...new Set(values.map(Number).filter((weekday) => Number.isInteger(weekday) && weekday >= 0 && weekday <= 6))]
    .sort((left, right) => left - right)
}

export function minutesFromTime(time: string) {
  const [hour = '0', minute = '0'] = normalizeTime(time).split(':')
  return Number(hour) * 60 + Number(minute)
}

export function timeFromMinutes(totalMinutes: number) {
  const hour = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
  const minute = String(totalMinutes % 60).padStart(2, '0')
  return `${hour}:${minute}`
}

export function normalizeTime(time: string | null | undefined) {
  return (time ?? '00:00').slice(0, 5)
}

export function formatFileSize(bytes: number) {
  if (!bytes) return '0 KB'

  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

export function getFileTypeLabel(fileType: string) {
  return fileTypeLabels[fileType as FileFilter] ?? fileType
}

export function statusClassName(status: BookingStatus | string) {
  if (status === 'confirmed') return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
  if (status === 'completed') return 'border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-200'
  if (status === 'cancelled') return 'border-red-500/35 bg-red-500/10 text-red-700 dark:text-red-200'
  return 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-200'
}

export function getDashboardStats(bookings: Booking[], files: SharedFile[], services: BookingService[]) {
  const todayKey = toDateKey(getStartOfToday())
  const nextBookings = bookings.filter(
    (booking) => booking.booking_date >= todayKey && booking.status !== 'cancelled',
  )

  return [
    {
      label: 'Proximas reservas',
      value: nextBookings.length,
      icon: CalendarDays,
      tone: 'text-onda-purple dark:text-onda-lavender',
    },
    {
      label: 'Archivos recibidos',
      value: files.length,
      icon: HardDrive,
      tone: 'text-emerald-700 dark:text-emerald-200',
    },
    {
      label: 'Servicios activos',
      value: services.length,
      icon: Sparkles,
      tone: 'text-sky-700 dark:text-sky-200',
    },
  ]
}

function normalizeStudio(row: StudioRow): Studio {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug ?? slugify(row.name),
    description: row.description ?? null,
    is_active: row.is_active ?? true,
  }
}

function normalizeProducer(row: ProducerRow): Producer {
  return {
    id: row.id,
    name: row.name,
    specialty: row.specialty ?? null,
    role: row.role ?? null,
    role_description: row.role_description ?? null,
    user_id: row.user_id ?? null,
    is_active: row.is_active ?? true,
  }
}

function normalizeBookingService(row: BookingServiceRow): BookingService {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    duration_minutes: row.duration_minutes ?? 60,
    requires_studio: row.requires_studio ?? true,
    requires_producer: row.requires_producer ?? false,
    is_active: row.is_active ?? true,
  }
}

function normalizeAvailabilityRule(row: AvailabilityRuleRow): AvailabilityRule {
  const weekdays = normalizeWeekdays(row.weekdays, typeof row.weekday === 'number' ? [row.weekday] : [])
  const weekday = typeof row.weekday === 'number' ? row.weekday : weekdays[0] ?? 0

  return {
    id: row.id,
    group_id: row.group_id ?? null,
    service_id: row.service_id ?? null,
    studio_id: row.studio_id ?? null,
    producer_id: row.producer_id ?? null,
    weekday,
    weekdays: weekdays.length > 0 ? weekdays : null,
    start_time: normalizeTime(row.start_time),
    end_time: normalizeTime(row.end_time),
    slot_minutes: row.slot_minutes ?? 60,
    is_active: row.is_active ?? true,
  }
}

function normalizeAvailabilityException(row: AvailabilityExceptionRow): AvailabilityException {
  const hasRangeColumns =
    Object.prototype.hasOwnProperty.call(row, 'date_from') ||
    Object.prototype.hasOwnProperty.call(row, 'date_to') ||
    Object.prototype.hasOwnProperty.call(row, 'weekdays')
  const dateFrom = row.date_from ?? row.exception_date
  const dateTo = hasRangeColumns ? row.date_to ?? null : row.exception_date
  const weekdays = normalizeWeekdays(row.weekdays, [getWeekdayFromDateKey(dateFrom)])

  return {
    id: row.id,
    group_id: row.group_id ?? null,
    service_id: row.service_id ?? null,
    studio_id: row.studio_id ?? null,
    producer_id: row.producer_id ?? null,
    exception_date: row.exception_date,
    date_from: dateFrom,
    date_to: dateTo,
    weekdays: weekdays.length > 0 ? weekdays : null,
    start_time: row.start_time ? normalizeTime(row.start_time) : null,
    end_time: row.end_time ? normalizeTime(row.end_time) : null,
    type: row.type,
    reason: row.reason ?? null,
  }
}

function normalizeFile(row: FileRow): SharedFile {
  return {
    id: row.id,
    file_name: row.file_name,
    file_type: row.file_type ?? 'demo',
    size_bytes: row.size_bytes ?? 0,
    uploaded_at: row.uploaded_at ?? new Date().toISOString(),
    project_name: row.project_name ?? null,
    bucket: row.bucket,
    storage_path: row.storage_path,
  }
}

function normalizeBookedSlot(row: BookedSlotRow): BookedSlot {
  return {
    start_time: normalizeTime(row.start_time),
    end_time: normalizeTime(row.end_time ?? timeFromMinutes(minutesFromTime(row.start_time) + 60)),
    status: normalizeBookingStatus(row.status),
  }
}

function mapModernBookings(
  rows: ModernBookingRow[],
  servicesById: Map<string, BookingService>,
  studiosById: Map<string, Studio>,
  producersById: Map<string, Producer>,
): Booking[] {
  return rows.map((row) => {
    const service = row.service_id ? servicesById.get(row.service_id) : undefined
    const studio = row.studio_id ? studiosById.get(row.studio_id) : undefined
    const producer = row.producer_id ? producersById.get(row.producer_id) : undefined
    const duration = service?.duration_minutes ?? 60

    return {
      id: row.id,
      client_id: row.client_id ?? null,
      service_id: row.service_id ?? null,
      studio_id: row.studio_id ?? null,
      producer_id: row.producer_id ?? null,
      booking_date: row.booking_date,
      start_time: normalizeTime(row.start_time),
      end_time: normalizeTime(row.end_time ?? timeFromMinutes(minutesFromTime(row.start_time) + duration)),
      status: normalizeBookingStatus(row.status),
      notes: row.notes ?? null,
      service_name: service?.name ?? 'Reserva Onda',
      studio_name: studio?.name ?? null,
      producer_name: producer?.name ?? null,
    }
  })
}

function mapLegacyBookings(rows: LegacyBookingRow[]): Booking[] {
  return rows.map((row) => {
    const legacyType = normalizeLegacyServiceType(row.service_type)

    return {
      id: row.id,
      client_id: null,
      service_id: null,
      studio_id: row.studio ?? null,
      producer_id: null,
      booking_date: row.booking_date,
      start_time: normalizeTime(row.booking_time),
      end_time: timeFromMinutes(minutesFromTime(row.booking_time) + 60),
      status: normalizeBookingStatus(row.status),
      notes: null,
      service_name: legacyServiceLabels[legacyType],
      studio_name: row.studio,
      producer_name: row.producer,
    }
  })
}

async function fetchBookingServices(): Promise<BookingService[]> {
  const modernResult = await supabase
    .from('booking_services')
    .select('id, name, description, duration_minutes, requires_studio, requires_producer, is_active')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (!modernResult.error) return ((modernResult.data ?? []) as BookingServiceRow[]).map(normalizeBookingService)
  if (isMissingTableOrFunction(modernResult.error)) return []
  if (!isMissingOrIncompleteSchema(modernResult.error)) throw modernResult.error

  const fallbackResult = await supabase
    .from('booking_services')
    .select('id, name')
    .order('name', { ascending: true })

  if (!fallbackResult.error) return ((fallbackResult.data ?? []) as BookingServiceRow[]).map(normalizeBookingService)
  if (isMissingOrIncompleteSchema(fallbackResult.error)) return []

  throw fallbackResult.error
}

async function fetchStudios(): Promise<Studio[]> {
  const modernResult = await supabase
    .from('studios')
    .select('id, name, slug, description, is_active')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (!modernResult.error) return ((modernResult.data ?? []) as StudioRow[]).map(normalizeStudio)
  if (isMissingTableOrFunction(modernResult.error)) return []
  if (!isMissingOrIncompleteSchema(modernResult.error)) throw modernResult.error

  const fallbackResult = await supabase
    .from('studios')
    .select('id, name, description')
    .order('name', { ascending: true })

  if (!fallbackResult.error) return ((fallbackResult.data ?? []) as StudioRow[]).map(normalizeStudio)
  if (isMissingOrIncompleteSchema(fallbackResult.error)) return []

  throw fallbackResult.error
}

async function fetchProducers(): Promise<Producer[]> {
  const modernResult = await supabase
    .from('producers')
    .select('id, name, specialty, role, role_description, user_id, is_active')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (!modernResult.error) return ((modernResult.data ?? []) as ProducerRow[]).map(normalizeProducer)
  if (isMissingTableOrFunction(modernResult.error)) return []
  if (!isMissingOrIncompleteSchema(modernResult.error)) throw modernResult.error

  const fallbackResult = await supabase
    .from('producers')
    .select('id, name, specialty, role, is_active')
    .order('name', { ascending: true })

  if (!fallbackResult.error) return ((fallbackResult.data ?? []) as ProducerRow[]).map(normalizeProducer)
  if (isMissingOrIncompleteSchema(fallbackResult.error)) return []

  throw fallbackResult.error
}

async function fetchAvailabilityRules(): Promise<AvailabilityRule[]> {
  const result = await supabase
    .from('availability_rules')
    .select('id, group_id, service_id, studio_id, producer_id, weekday, weekdays, start_time, end_time, slot_minutes, is_active')
    .eq('is_active', true)
    .order('weekday', { ascending: true })
    .order('start_time', { ascending: true })

  if (!result.error) return ((result.data ?? []) as AvailabilityRuleRow[]).map(normalizeAvailabilityRule)
  if (isMissingOrIncompleteSchema(result.error)) {
    const legacyResult = await supabase
      .from('availability_rules')
      .select('id, service_id, studio_id, producer_id, weekday, start_time, end_time, slot_minutes, is_active')
      .eq('is_active', true)
      .order('weekday', { ascending: true })
      .order('start_time', { ascending: true })

    if (!legacyResult.error) return ((legacyResult.data ?? []) as AvailabilityRuleRow[]).map(normalizeAvailabilityRule)
    if (isMissingOrIncompleteSchema(legacyResult.error)) return []

    throw legacyResult.error
  }

  throw result.error
}

async function fetchAvailabilityExceptions(): Promise<AvailabilityException[]> {
  const todayKey = toDateKey(getStartOfToday())
  const result = await supabase
    .from('availability_exceptions')
    .select('id, group_id, service_id, studio_id, producer_id, exception_date, date_from, date_to, weekdays, start_time, end_time, type, reason')
    .or(`exception_date.gte.${todayKey},date_to.is.null,date_to.gte.${todayKey}`)
    .order('exception_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (!result.error) return ((result.data ?? []) as AvailabilityExceptionRow[]).map(normalizeAvailabilityException)
  if (isMissingOrIncompleteSchema(result.error)) {
    const legacyResult = await supabase
      .from('availability_exceptions')
      .select('id, service_id, studio_id, producer_id, exception_date, start_time, end_time, type, reason')
      .gte('exception_date', todayKey)
      .order('exception_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (!legacyResult.error) return ((legacyResult.data ?? []) as AvailabilityExceptionRow[]).map(normalizeAvailabilityException)
    if (isMissingOrIncompleteSchema(legacyResult.error)) return []

    throw legacyResult.error
  }

  throw result.error
}

async function fetchFilesFromTable(tableName: 'files' | 'client_files'): Promise<SharedFile[] | null> {
  const result = await supabase
    .from(tableName)
    .select('id, file_name, file_type, size_bytes, uploaded_at, project_name, bucket, storage_path')
    .order('uploaded_at', { ascending: false })

  if (!result.error) return ((result.data ?? []) as FileRow[]).map(normalizeFile)
  if (isMissingOrIncompleteSchema(result.error)) return null

  throw result.error
}

async function fetchFiles(): Promise<SharedFile[]> {
  const files = await fetchFilesFromTable('files')
  if (files) return files

  const clientFiles = await fetchFilesFromTable('client_files')
  return clientFiles ?? []
}

async function fetchBookings(
  services: BookingService[],
  studios: Studio[],
  producers: Producer[],
): Promise<Booking[]> {
  const servicesById = new Map(services.map((service) => [service.id, service]))
  const studiosById = new Map(studios.map((studio) => [studio.id, studio]))
  const producersById = new Map(producers.map((producer) => [producer.id, producer]))

  const modernResult = await supabase
    .from('bookings')
    .select('id, client_id, service_id, studio_id, producer_id, booking_date, start_time, end_time, status, notes')
    .order('booking_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (!modernResult.error) {
    return mapModernBookings((modernResult.data ?? []) as ModernBookingRow[], servicesById, studiosById, producersById)
  }

  if (isMissingTableOrFunction(modernResult.error)) return []
  if (!isMissingOrIncompleteSchema(modernResult.error)) throw modernResult.error

  const legacyResult = await supabase
    .from('bookings')
    .select('id, studio, producer, booking_date, booking_time, service_type, status')
    .order('booking_date', { ascending: true })
    .order('booking_time', { ascending: true })

  if (!legacyResult.error) return mapLegacyBookings((legacyResult.data ?? []) as LegacyBookingRow[])
  if (isMissingOrIncompleteSchema(legacyResult.error)) return []

  throw legacyResult.error
}

async function runDashboardSection<T>(
  issues: DashboardIssue[],
  section: string,
  task: () => Promise<T>,
  fallback: T,
) {
  try {
    return await task()
  } catch (error) {
    issues.push({ section, message: getErrorMessage(error) })
    return fallback
  }
}

export async function fetchDashboardData(): Promise<DashboardData> {
  const issues: DashboardIssue[] = []

  const [services, studios, producers, availabilityRules, availabilityExceptions] = await Promise.all([
    runDashboardSection(issues, 'Servicios', fetchBookingServices, []),
    runDashboardSection(issues, 'Estudios', fetchStudios, []),
    runDashboardSection(issues, 'Equipo', fetchProducers, []),
    runDashboardSection(issues, 'Disponibilidad semanal', fetchAvailabilityRules, []),
    runDashboardSection(issues, 'Excepciones de disponibilidad', fetchAvailabilityExceptions, []),
  ])

  const [bookings, files] = await Promise.all([
    runDashboardSection(issues, 'Reservas', () => fetchBookings(services, studios, producers), []),
    runDashboardSection(issues, 'Archivos', fetchFiles, []),
  ])

  return {
    services,
    studios,
    producers,
    availabilityRules,
    availabilityExceptions,
    bookings,
    files,
    issues,
  }
}

export function serviceCanBeBooked(service: BookingService, studios: Studio[], producers: Producer[]) {
  return (!service.requires_studio || studios.length > 0) && (!service.requires_producer || producers.length > 0)
}

export function getFirstBookableService(services: BookingService[], studios: Studio[], producers: Producer[]) {
  return services.find((service) => serviceCanBeBooked(service, studios, producers)) ?? null
}

export function getServiceById(services: BookingService[], serviceId: string) {
  return services.find((service) => service.id === serviceId) ?? null
}

export function isBookingSelectionReady(
  services: BookingService[],
  selection: BookingSelection,
) {
  const service = getServiceById(services, selection.serviceId)

  if (!service) return false
  if (service.requires_studio && !selection.studioId) return false
  if (service.requires_producer && !selection.producerId) return false

  return true
}

function valueMatchesRule(ruleValue: string | null, selectedValue: string | null | undefined) {
  return !ruleValue || ruleValue === selectedValue
}

function ruleMatchesSelection(rule: AvailabilityRule, selection: BookingSelection) {
  if (!rule.is_active) return false
  if (rule.service_id && rule.service_id !== selection.serviceId) return false
  if (!valueMatchesRule(rule.studio_id, selection.studioId)) return false
  if (!valueMatchesRule(rule.producer_id, selection.producerId)) return false

  return true
}

function ruleMatchesWeekday(rule: AvailabilityRule, weekday: number) {
  const weekdays = rule.weekdays?.length ? rule.weekdays : [rule.weekday]
  return weekdays.includes(weekday)
}

function exceptionMatchesSelection(exception: AvailabilityException, selection: BookingSelection, dateKey: string) {
  const dateWeekday = getWeekdayFromDateKey(dateKey)
  const weekdays = exception.weekdays?.length ? exception.weekdays : [getWeekdayFromDateKey(exception.exception_date)]

  if (dateKey < exception.date_from) return false
  if (exception.date_to && dateKey > exception.date_to) return false
  if (!weekdays.includes(dateWeekday)) return false
  if (exception.service_id && exception.service_id !== selection.serviceId) return false
  if (!valueMatchesRule(exception.studio_id, selection.studioId)) return false
  if (!valueMatchesRule(exception.producer_id, selection.producerId)) return false

  return true
}

function intervalsOverlap(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA
}

function generateSlots(startTime: string, endTime: string, durationMinutes: number, slotMinutes: number) {
  const slots: AvailabilitySlot[] = []
  const start = minutesFromTime(startTime)
  const normalizedEndTime = normalizeTime(endTime)
  const end = normalizedEndTime === '23:59' ? minutesFromTime(endTime) + 1 : minutesFromTime(endTime)
  const step = Math.max(slotMinutes, 5)

  for (let minute = start; minute + durationMinutes <= end; minute += step) {
    slots.push({
      startTime: timeFromMinutes(minute),
      endTime: timeFromMinutes(minute + durationMinutes),
      source: 'rule',
    })
  }

  return slots
}

function isPastSlot(dateKey: string, startTime: string) {
  const now = new Date()

  if (dateKey !== toDateKey(now)) return false

  return minutesFromTime(startTime) <= now.getHours() * 60 + now.getMinutes()
}

export function buildAvailableSlots({
  bookedSlots = [],
  date,
  exceptions,
  excludePast = true,
  producerId,
  rules,
  serviceId,
  services,
  studioId,
}: BuildAvailableSlotsInput) {
  const dateKey = typeof date === 'string' ? date : toDateKey(date)
  const dateValue = typeof date === 'string' ? dateFromKey(date) : date
  const service = getServiceById(services, serviceId)

  if (!service || !isBookingSelectionReady(services, { serviceId, studioId, producerId })) {
    return []
  }

  const selection = { serviceId, studioId: studioId ?? null, producerId: producerId ?? null }
  const weekday = dateValue.getDay()
  const duration = Math.max(service.duration_minutes, 5)
  const baseSlots = rules
    .filter((rule) => ruleMatchesWeekday(rule, weekday) && ruleMatchesSelection(rule, selection))
    .flatMap((rule) => generateSlots(rule.start_time, rule.end_time, duration, rule.slot_minutes))

  const matchingExceptions = exceptions.filter((exception) => exceptionMatchesSelection(exception, selection, dateKey))
  const exceptionSlots = matchingExceptions
    .filter((exception) => exception.type === 'available' && exception.start_time && exception.end_time)
    .flatMap((exception) =>
      generateSlots(exception.start_time ?? '00:00', exception.end_time ?? '00:00', duration, service.duration_minutes).map(
        (slot) => ({ ...slot, source: 'exception' as const }),
      ),
    )

  const blockedExceptions = matchingExceptions.filter((exception) => exception.type === 'blocked')
  const uniqueSlots = new Map<string, AvailabilitySlot>()

  for (const slot of [...baseSlots, ...exceptionSlots]) {
    uniqueSlots.set(slot.startTime, slot)
  }

  return [...uniqueSlots.values()]
    .filter((slot) => {
      if (excludePast && isPastSlot(dateKey, slot.startTime)) return false

      const slotStart = minutesFromTime(slot.startTime)
      const slotEnd = minutesFromTime(slot.endTime)
      const isBlocked = blockedExceptions.some((exception) => {
        if (!exception.start_time || !exception.end_time) return true
        return intervalsOverlap(slotStart, slotEnd, minutesFromTime(exception.start_time), minutesFromTime(exception.end_time))
      })

      if (isBlocked) return false

      return !bookedSlots.some((bookedSlot) =>
        intervalsOverlap(
          slotStart,
          slotEnd,
          minutesFromTime(bookedSlot.start_time),
          minutesFromTime(bookedSlot.end_time),
        ),
      )
    })
    .sort((left, right) => minutesFromTime(left.startTime) - minutesFromTime(right.startTime))
}

export function getAvailableDateKeys({
  days = 90,
  exceptions,
  producerId,
  rules,
  serviceId,
  services,
  studioId,
}: Omit<BuildAvailableSlotsInput, 'date' | 'bookedSlots' | 'excludePast'> & { days?: number }) {
  const dateKeys = new Set<string>()
  const today = getStartOfToday()

  for (let index = 0; index < days; index += 1) {
    const date = new Date(today)
    date.setDate(today.getDate() + index)

    const slots = buildAvailableSlots({
      services,
      rules,
      exceptions,
      serviceId,
      studioId,
      producerId,
      date,
      excludePast: false,
    })

    if (slots.length > 0) dateKeys.add(toDateKey(date))
  }

  return dateKeys
}

export async function getPublicAvailabilityPreview({
  days = 21,
  fromDate = toDateKey(getStartOfToday()),
  limit = 80,
}: PublicAvailabilityPreviewInput = {}): Promise<PublicAvailabilityPreviewSlot[]> {
  const { data, error } = await supabase.rpc('get_public_availability_preview', {
    p_days: Math.min(Math.max(days, 1), 90),
    p_from_date: fromDate,
    p_limit: Math.min(Math.max(limit, 1), 200),
  })

  if (error) throw error

  return ((data ?? []) as PublicAvailabilityPreviewRow[]).map((slot) => ({
    ...slot,
    end_time: normalizeTime(slot.end_time),
    source: slot.source === 'exception' ? 'exception' : 'rule',
    start_time: normalizeTime(slot.start_time),
  }))
}

function bookedSlotMatchesSelection(row: BookedSlotRow, selection: BookingSelection) {
  if (selection.studioId && row.studio_id === selection.studioId) return true
  if (selection.producerId && row.producer_id === selection.producerId) return true

  return (
    !selection.studioId &&
    !selection.producerId &&
    Boolean(selection.serviceId) &&
    row.service_id === selection.serviceId &&
    !row.studio_id &&
    !row.producer_id
  )
}

async function fetchBookedSlotsFromBookings({
  bookingDate,
  producerId,
  serviceId,
  studioId,
}: FetchBookedSlotsInput) {
  const result = await supabase
    .from('bookings')
    .select('start_time, end_time, status, service_id, studio_id, producer_id')
    .eq('booking_date', bookingDate)
    .in('status', activeBookingStatuses)
    .order('start_time', { ascending: true })

  if (!result.error) {
    return ((result.data ?? []) as BookedSlotRow[])
      .filter((row) => bookedSlotMatchesSelection(row, { serviceId, studioId, producerId }))
      .map(normalizeBookedSlot)
  }

  if (!isMissingOrIncompleteSchema(result.error)) throw result.error
  if (isMissingTableOrFunction(result.error)) return []

  const legacyResult = await supabase
    .from('bookings')
    .select('booking_time, status')
    .eq('booking_date', bookingDate)
    .eq('studio', studioId ?? '')
    .in('status', activeBookingStatuses)
    .order('booking_time', { ascending: true })

  if (legacyResult.error) {
    if (isMissingOrIncompleteSchema(legacyResult.error)) return []
    throw legacyResult.error
  }

  return ((legacyResult.data ?? []) as Array<{ booking_time: string; status: string | null }>).map((slot) => ({
    start_time: normalizeTime(slot.booking_time),
    end_time: timeFromMinutes(minutesFromTime(slot.booking_time) + 60),
    status: normalizeBookingStatus(slot.status),
  }))
}

export async function fetchBookedSlots(input: FetchBookedSlotsInput) {
  const { data, error } = await supabase.rpc('get_booked_slots', {
    p_booking_date: input.bookingDate,
    p_service_id: input.serviceId || null,
    p_studio_id: input.studioId || null,
    p_producer_id: input.producerId || null,
  })

  if (!error) return ((data ?? []) as BookedSlotRow[]).map(normalizeBookedSlot)
  if (!isMissingOrIncompleteSchema(error)) throw error

  return fetchBookedSlotsFromBookings(input)
}

export async function createBooking(input: CreateBookingInput) {
  if (!input.clientId) {
    throw new Error('Missing authenticated client id.')
  }

  if (!input.serviceId) {
    throw new Error('Missing booking service id.')
  }

  if (!input.bookingDate || !input.startTime || !input.endTime) {
    throw new Error('Missing booking date or time.')
  }

  const modernPayload = {
    client_id: input.clientId,
    service_id: input.serviceId,
    studio_id: input.studioId || null,
    producer_id: input.producerId || null,
    booking_date: input.bookingDate,
    start_time: input.startTime,
    end_time: input.endTime,
    notes: input.notes,
    status: 'pending' satisfies BookingStatus,
  }

  const modernResult = await supabase.from('bookings').insert(modernPayload)

  if (!modernResult.error) return
  throw modernResult.error
}

export async function createFileDownloadUrl(file: SharedFile) {
  const { data, error } = await supabase.storage
    .from(file.bucket)
    .createSignedUrl(file.storage_path, 60, { download: file.file_name })

  if (error) throw error

  return data.signedUrl
}
