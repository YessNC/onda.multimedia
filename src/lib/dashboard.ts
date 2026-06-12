import type { User } from '@supabase/supabase-js'
import { CalendarDays, HardDrive, Sparkles } from 'lucide-react'
import { supabase } from './supabaseClient'

export type DashboardTab = 'calendar' | 'files'
export type BookingStatus =
  | 'pending_payment'
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'rejected'
  | 'payment_failed'
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded' | 'waived'
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
  | 'document'
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
  assigned_service_ids: string[]
  assigned_studio_ids: string[]
  assignments_loaded: boolean
  id: string
  name: string
  specialty: string | null
  role: string | null
  role_description: string | null
  user_id: string | null
  is_active: boolean
}

export interface BookingService {
  assigned_studio_ids: string[]
  id: string
  name: string
  description: string | null
  duration_minutes: number
  price_per_slot: number
  currency: string
  deposit_percent: number
  requires_studio: boolean
  studio_assignments_loaded: boolean
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
  total_hours: number | null
  total_amount: number | null
  deposit_amount: number | null
  deposit_amount_before_discount: number | null
  deposit_amount_due: number | null
  deposit_percent: number | null
  discount_amount: number | null
  discount_code: string | null
  discount_percent: number | null
  currency: string | null
  paid_at: string | null
  payment_hold_expires_at: string | null
  payment_provider: string | null
  payment_reference: string | null
  payment_status: PaymentStatus | null
  payment_transaction_id: string | null
  payment_validation_code: string | null
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
  title: string | null
  description: string | null
  booking_id: string | null
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

export interface CommunityPreferences {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  terms_accepted: boolean
  terms_accepted_at: string | null
  terms_source: string | null
  community_consent: boolean
  community_consent_at: string | null
  community_consent_source: string | null
  community_consent_revoked_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface DashboardData {
  services: BookingService[]
  studios: Studio[]
  producers: Producer[]
  availabilityRules: AvailabilityRule[]
  availabilityExceptions: AvailabilityException[]
  bookings: Booking[]
  communityPreferences: CommunityPreferences | null
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
  producers?: Producer[]
  rules: AvailabilityRule[]
  exceptions: AvailabilityException[]
  studios?: Studio[]
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
  discountCode?: string | null
  startTime: string
  endTime: string
  selectedSlots: Array<{
    endTime: string
    startTime: string
  }>
  notes: string | null
}

export interface CreateBookingResult {
  id: string
  total_amount: number
  deposit_amount: number
  deposit_amount_due: number
  discount_amount: number
  currency: string
  status: BookingStatus
  payment_status: PaymentStatus
  payment_provider: string | null
  payment_reference: string | null
  payment_validation_code: string | null
  payment_checkout_url: string | null
  payment_hold_expires_at: string | null
}

export interface DiscountPreview {
  total_amount: number
  deposit_amount: number
  deposit_amount_due: number
  discount_amount: number
  discount_percent: number | null
  currency: string
}

export interface PublicAvailabilityPreviewInput {
  days?: number
  fromDate?: string
  limit?: number
}

export interface BookingDraft {
  booking_date: string
  created_at: number
  discount_code: string
  notes: string
  producer_id: string | null
  selected_slots: Array<{
    endTime: string
    startTime: string
  }>
  service_id: string
  studio_id: string | null
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

type BookingServiceStudioRow = {
  is_active?: boolean | null
  service_id: string | null
  studio_id: string | null
}

type ProducerStudioRow = {
  is_active?: boolean | null
  producer_id: string | null
  studio_id: string | null
}

type ProducerServiceRow = {
  is_active?: boolean | null
  producer_id: string | null
  service_id: string | null
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
  total_hours?: number | null
  total_amount?: number | null
  deposit_amount?: number | null
  deposit_amount_before_discount?: number | null
  deposit_amount_due?: number | null
  deposit_percent?: number | null
  discount_amount?: number | null
  discount_code?: string | null
  discount_percent?: number | null
  currency?: string | null
  paid_at?: string | null
  payment_hold_expires_at?: string | null
  payment_provider?: string | null
  payment_reference?: string | null
  payment_status?: string | null
  payment_transaction_id?: string | null
  payment_validation_code?: string | null
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

type CreateBookingRow = Partial<CreateBookingResult> & {
  id: string
}

type DiscountPreviewRow = Partial<DiscountPreview>

type PublicAvailabilityPreviewRow = Omit<PublicAvailabilityPreviewSlot, 'end_time' | 'source' | 'start_time'> & {
  end_time: string | null
  source: string | null
  start_time: string | null
}

type CommunityPreferencesRow = Partial<CommunityPreferences> & {
  id: string
}

const communityPreferencesColumns =
  'id, email, full_name, phone, terms_accepted, terms_accepted_at, terms_source, community_consent, community_consent_at, community_consent_source, community_consent_revoked_at, created_at, updated_at'
const activeBookingStatuses: BookingStatus[] = ['pending_payment', 'pending', 'confirmed', 'completed']
const bookingDraftStorageKey = 'onda-booking-draft-v1'
const bookingDraftMaxAgeMs = 30 * 60 * 1000

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
  document: 'Documento',
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
  'document',
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

function canUseSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'
}

function isBookingDraft(value: unknown): value is BookingDraft {
  if (!value || typeof value !== 'object') return false

  const draft = value as Partial<BookingDraft>

  return (
    typeof draft.created_at === 'number' &&
    typeof draft.booking_date === 'string' &&
    typeof draft.service_id === 'string' &&
    Array.isArray(draft.selected_slots)
  )
}

export function readBookingDraft() {
  if (!canUseSessionStorage()) return null

  try {
    const rawDraft = window.sessionStorage.getItem(bookingDraftStorageKey)
    if (!rawDraft) return null

    const draft = JSON.parse(rawDraft) as unknown

    if (!isBookingDraft(draft) || Date.now() - draft.created_at > bookingDraftMaxAgeMs) {
      window.sessionStorage.removeItem(bookingDraftStorageKey)
      return null
    }

    return draft
  } catch {
    window.sessionStorage.removeItem(bookingDraftStorageKey)
    return null
  }
}

export function saveBookingDraft(update: Partial<Omit<BookingDraft, 'created_at'>>) {
  if (!canUseSessionStorage()) return

  const currentDraft = readBookingDraft()
  const hasProducerId = Object.prototype.hasOwnProperty.call(update, 'producer_id')
  const hasStudioId = Object.prototype.hasOwnProperty.call(update, 'studio_id')
  const nextDraft: BookingDraft = {
    booking_date: update.booking_date ?? currentDraft?.booking_date ?? toDateKey(getStartOfToday()),
    created_at: Date.now(),
    discount_code: update.discount_code ?? currentDraft?.discount_code ?? '',
    notes: update.notes ?? currentDraft?.notes ?? '',
    producer_id: hasProducerId ? update.producer_id ?? null : currentDraft?.producer_id ?? null,
    selected_slots: update.selected_slots ?? currentDraft?.selected_slots ?? [],
    service_id: update.service_id ?? currentDraft?.service_id ?? '',
    studio_id: hasStudioId ? update.studio_id ?? null : currentDraft?.studio_id ?? null,
  }

  if (!nextDraft.service_id) {
    window.sessionStorage.removeItem(bookingDraftStorageKey)
    return
  }

  window.sessionStorage.setItem(bookingDraftStorageKey, JSON.stringify(nextDraft))
}

export function clearBookingDraft() {
  if (canUseSessionStorage()) {
    window.sessionStorage.removeItem(bookingDraftStorageKey)
  }
}

export function normalizeComparableName(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function nameTokens(value: string) {
  return normalizeComparableName(value).split(' ').filter(Boolean)
}

function tokenSetContainsAll(container: string[], contained: string[]) {
  return contained.length > 0 && contained.every((token) => container.includes(token))
}

export function namesLookLikeSameTeamMember(leftName: string, rightName: string) {
  const left = normalizeComparableName(leftName)
  const right = normalizeComparableName(rightName)

  if (!left || !right) return false
  if (left === right) return true

  const leftTokens = nameTokens(left)
  const rightTokens = nameTokens(right)

  return (
    (leftTokens.length === 1 && tokenSetContainsAll(rightTokens, leftTokens)) ||
    (rightTokens.length === 1 && tokenSetContainsAll(leftTokens, rightTokens))
  )
}

function normalizeBookingStatus(value: string | null | undefined): BookingStatus {
  if (value === 'payment_failed') return 'rejected'

  if (
    value === 'pending_payment' ||
    value === 'confirmed' ||
    value === 'cancelled' ||
    value === 'completed' ||
    value === 'rejected' ||
    value === 'pending'
  ) {
    return value
  }

  return 'pending'
}

function normalizePaymentStatus(value: string | null | undefined): PaymentStatus {
  if (
    value === 'unpaid' ||
    value === 'pending' ||
    value === 'paid' ||
    value === 'failed' ||
    value === 'refunded' ||
    value === 'waived'
  ) {
    return value
  }

  if (value === 'not_required') return 'waived'

  return 'unpaid'
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

export function formatMoney(amount: number | null | undefined, currency = 'CLP', locale = 'es-CL') {
  const value = Number(amount ?? 0)

  return new Intl.NumberFormat(locale, {
    currency: currency || 'CLP',
    maximumFractionDigits: currency === 'CLP' ? 0 : 2,
    minimumFractionDigits: 0,
    style: 'currency',
  }).format(value)
}

export function getFileTypeLabel(fileType: string) {
  return fileTypeLabels[fileType as FileFilter] ?? fileType
}

export function statusClassName(status: BookingStatus | string) {
  if (status === 'confirmed') return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
  if (status === 'completed') return 'border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-200'
  if (status === 'cancelled') return 'border-red-500/35 bg-red-500/10 text-red-700 dark:text-red-200'
  if (status === 'payment_failed' || status === 'rejected') return 'border-red-500/35 bg-red-500/10 text-red-700 dark:text-red-200'
  if (status === 'pending_payment') return 'border-fuchsia-500/35 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-200'
  return 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-200'
}

export function paymentStatusClassName(status: PaymentStatus | string | null | undefined) {
  if (status === 'paid') return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
  if (status === 'waived') return 'border-violet-500/35 bg-violet-500/10 text-violet-700 dark:text-violet-200'
  if (status === 'failed') return 'border-red-500/35 bg-red-500/10 text-red-700 dark:text-red-200'
  if (status === 'refunded') return 'border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-200'
  if (status === 'pending') return 'border-fuchsia-500/35 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-200'
  return 'border-zinc-400/35 bg-zinc-500/10 text-zinc-700 dark:text-zinc-200'
}

export function getDashboardStats(bookings: Booking[], files: SharedFile[], services: BookingService[]) {
  const todayKey = toDateKey(getStartOfToday())
  const nextBookings = bookings.filter(
    (booking) => booking.booking_date >= todayKey && activeBookingStatuses.includes(booking.status),
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
    assigned_service_ids: row.assigned_service_ids ?? [],
    assigned_studio_ids: row.assigned_studio_ids ?? [],
    assignments_loaded: row.assignments_loaded ?? false,
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
    assigned_studio_ids: row.assigned_studio_ids ?? [],
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    duration_minutes: row.duration_minutes ?? 60,
    price_per_slot: Number(row.price_per_slot ?? 0),
    currency: row.currency ?? 'CLP',
    deposit_percent: Number(row.deposit_percent ?? 50),
    requires_studio: row.requires_studio ?? true,
    studio_assignments_loaded: row.studio_assignments_loaded ?? false,
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
    title: row.title ?? null,
    description: row.description ?? null,
    booking_id: row.booking_id ?? null,
  }
}

function normalizeBookedSlot(row: BookedSlotRow): BookedSlot {
  return {
    start_time: normalizeTime(row.start_time),
    end_time: normalizeTime(row.end_time ?? timeFromMinutes(minutesFromTime(row.start_time) + 60)),
    status: normalizeBookingStatus(row.status),
  }
}

function readTrimmedText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeCommunityPreferences(row: CommunityPreferencesRow): CommunityPreferences {
  return {
    id: row.id,
    email: readTrimmedText(row.email).toLowerCase(),
    full_name: readTrimmedText(row.full_name) || null,
    phone: readTrimmedText(row.phone) || null,
    terms_accepted: Boolean(row.terms_accepted),
    terms_accepted_at: row.terms_accepted_at ?? null,
    terms_source: readTrimmedText(row.terms_source) || null,
    community_consent: Boolean(row.community_consent),
    community_consent_at: row.community_consent_at ?? null,
    community_consent_source: readTrimmedText(row.community_consent_source) || null,
    community_consent_revoked_at: row.community_consent_revoked_at ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
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
      total_hours: row.total_hours ?? null,
      total_amount: row.total_amount ?? null,
      deposit_amount: row.deposit_amount ?? null,
      deposit_amount_before_discount: row.deposit_amount_before_discount ?? row.deposit_amount ?? null,
      deposit_amount_due: row.deposit_amount_due ?? row.deposit_amount ?? null,
      deposit_percent: row.deposit_percent ?? null,
      discount_amount: row.discount_amount ?? null,
      discount_code: row.discount_code ?? null,
      discount_percent: row.discount_percent ?? null,
      currency: row.currency ?? null,
      paid_at: row.paid_at ?? null,
      payment_hold_expires_at: row.payment_hold_expires_at ?? null,
      payment_provider: row.payment_provider ?? null,
      payment_reference: row.payment_reference ?? null,
      payment_status: normalizePaymentStatus(row.payment_status),
      payment_transaction_id: row.payment_transaction_id ?? null,
      payment_validation_code: row.payment_validation_code ?? null,
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
      total_hours: null,
      total_amount: null,
      deposit_amount: null,
      deposit_amount_before_discount: null,
      deposit_amount_due: null,
      deposit_percent: null,
      discount_amount: null,
      discount_code: null,
      discount_percent: null,
      currency: null,
      paid_at: null,
      payment_hold_expires_at: null,
      payment_provider: null,
      payment_reference: null,
      payment_status: null,
      payment_transaction_id: null,
      payment_validation_code: null,
      service_name: legacyServiceLabels[legacyType],
      studio_name: row.studio,
      producer_name: row.producer,
    }
  })
}

async function fetchBookingServices(): Promise<BookingService[]> {
  const modernResult = await supabase
    .from('booking_services')
    .select('id, name, description, duration_minutes, price_per_slot, currency, deposit_percent, requires_studio, requires_producer, is_active')
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

async function fetchBookingServiceStudios(): Promise<{ loaded: boolean; rows: BookingServiceStudioRow[] }> {
  const result = await supabase
    .from('booking_service_studios')
    .select('service_id, studio_id, is_active')
    .eq('is_active', true)

  if (!result.error) {
    return {
      loaded: true,
      rows: (result.data ?? []) as BookingServiceStudioRow[],
    }
  }

  if (isMissingOrIncompleteSchema(result.error)) return { loaded: false, rows: [] }
  throw result.error
}

async function fetchProducerStudios(): Promise<{ loaded: boolean; rows: ProducerStudioRow[] }> {
  const result = await supabase
    .from('producer_studios')
    .select('producer_id, studio_id, is_active')
    .eq('is_active', true)

  if (!result.error) {
    return {
      loaded: true,
      rows: (result.data ?? []) as ProducerStudioRow[],
    }
  }

  if (isMissingOrIncompleteSchema(result.error)) return { loaded: false, rows: [] }
  throw result.error
}

async function fetchProducerServices(): Promise<{ loaded: boolean; rows: ProducerServiceRow[] }> {
  const result = await supabase
    .from('producer_services')
    .select('producer_id, service_id, is_active')
    .eq('is_active', true)

  if (!result.error) {
    return {
      loaded: true,
      rows: (result.data ?? []) as ProducerServiceRow[],
    }
  }

  if (isMissingOrIncompleteSchema(result.error)) return { loaded: false, rows: [] }
  throw result.error
}

function collectAssignmentIds<TRow extends object>(
  rows: TRow[],
  ownerKey: keyof TRow,
  targetKey: keyof TRow,
) {
  const assignmentIds = new Map<string, string[]>()

  for (const row of rows) {
    const ownerId = row[ownerKey]
    const targetId = row[targetKey]

    if (typeof ownerId !== 'string' || typeof targetId !== 'string') continue

    const currentValues = assignmentIds.get(ownerId) ?? []
    currentValues.push(targetId)
    assignmentIds.set(ownerId, currentValues)
  }

  return assignmentIds
}

function attachServiceStudioAssignments(
  services: BookingService[],
  assignments: { loaded: boolean; rows: BookingServiceStudioRow[] },
) {
  if (!assignments.loaded) {
    return services.map((service) => ({
      ...service,
      assigned_studio_ids: [],
      studio_assignments_loaded: false,
    }))
  }

  const studiosByServiceId = collectAssignmentIds(assignments.rows, 'service_id', 'studio_id')

  return services.map((service) => ({
    ...service,
    assigned_studio_ids: studiosByServiceId.get(service.id) ?? [],
    studio_assignments_loaded: true,
  }))
}

function attachProducerAssignments(
  producers: Producer[],
  studioAssignments: { loaded: boolean; rows: ProducerStudioRow[] },
  serviceAssignments: { loaded: boolean; rows: ProducerServiceRow[] },
) {
  const assignmentsLoaded = studioAssignments.loaded && serviceAssignments.loaded

  if (!assignmentsLoaded) {
    return producers.map((producer) => ({
      ...producer,
      assigned_service_ids: [],
      assigned_studio_ids: [],
      assignments_loaded: false,
    }))
  }

  const studiosByProducerId = collectAssignmentIds(studioAssignments.rows, 'producer_id', 'studio_id')
  const servicesByProducerId = collectAssignmentIds(serviceAssignments.rows, 'producer_id', 'service_id')

  return producers.map((producer) => ({
    ...producer,
    assigned_service_ids: servicesByProducerId.get(producer.id) ?? [],
    assigned_studio_ids: studiosByProducerId.get(producer.id) ?? [],
    assignments_loaded: true,
  }))
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
    .select('id, file_name, file_type, size_bytes, uploaded_at, project_name, bucket, storage_path, title, description, booking_id')
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
    .select('id, client_id, service_id, studio_id, producer_id, booking_date, start_time, end_time, status, notes, total_hours, total_amount, deposit_amount, deposit_amount_before_discount, deposit_amount_due, deposit_percent, discount_amount, discount_code, discount_percent, currency, paid_at, payment_hold_expires_at, payment_provider, payment_reference, payment_status, payment_transaction_id, payment_validation_code')
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

async function fetchCommunityPreferences(): Promise<CommunityPreferences | null> {
  const { data, error } = await supabase.rpc('get_dashboard_community_preferences')

  if (!error) {
    const row = ((data ?? []) as CommunityPreferencesRow[])[0]

    return row ? normalizeCommunityPreferences(row) : null
  }

  if (isMissingOrIncompleteSchema(error)) {
    try {
      return await fetchCommunityPreferencesFromProfile()
    } catch (fallbackError) {
      if (isMissingOrIncompleteSchema(getDashboardError(fallbackError))) return null
      throw fallbackError
    }
  }

  throw error
}

async function getAuthenticatedProfileUser() {
  const { data, error } = await supabase.auth.getUser()

  if (error) throw error
  if (!data.user) throw new Error('Missing authenticated user.')

  return data.user
}

function getProfilePayloadFromUser(user: User) {
  const metadata = user.user_metadata as {
    full_name?: string
    phone?: string
  }
  const email = readTrimmedText(user.email).toLowerCase()

  return {
    id: user.id,
    email,
    full_name: readTrimmedText(metadata.full_name) || email.split('@')[0] || '',
    phone: readTrimmedText(metadata.phone) || null,
  }
}

async function upsertOwnCommunityProfile(user: User) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(getProfilePayloadFromUser(user), { onConflict: 'id' })
    .select(communityPreferencesColumns)
    .single()

  if (error) throw error

  return normalizeCommunityPreferences(data as CommunityPreferencesRow)
}

async function fetchCommunityPreferencesFromProfile() {
  const user = await getAuthenticatedProfileUser()

  return upsertOwnCommunityProfile(user)
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

  const [
    services,
    studios,
    producers,
    availabilityRules,
    availabilityExceptions,
    serviceStudioAssignments,
    producerStudioAssignments,
    producerServiceAssignments,
    communityPreferences,
  ] = await Promise.all([
    runDashboardSection(issues, 'Servicios', fetchBookingServices, []),
    runDashboardSection(issues, 'Estudios', fetchStudios, []),
    runDashboardSection(issues, 'Equipo', fetchProducers, []),
    runDashboardSection(issues, 'Disponibilidad semanal', fetchAvailabilityRules, []),
    runDashboardSection(issues, 'Excepciones de disponibilidad', fetchAvailabilityExceptions, []),
    runDashboardSection(issues, 'Asignaciones servicio-estudio', fetchBookingServiceStudios, { loaded: false, rows: [] }),
    runDashboardSection(issues, 'Asignaciones estudio-equipo', fetchProducerStudios, { loaded: false, rows: [] }),
    runDashboardSection(issues, 'Asignaciones servicio-equipo', fetchProducerServices, { loaded: false, rows: [] }),
    runDashboardSection(issues, 'Preferencias comunidad', fetchCommunityPreferences, null),
  ])
  const servicesWithAssignments = attachServiceStudioAssignments(services, serviceStudioAssignments)
  const producersWithAssignments = attachProducerAssignments(
    producers,
    producerStudioAssignments,
    producerServiceAssignments,
  )

  const [bookings, files] = await Promise.all([
    runDashboardSection(issues, 'Reservas', () => fetchBookings(servicesWithAssignments, studios, producersWithAssignments), []),
    runDashboardSection(issues, 'Archivos', fetchFiles, []),
  ])

  return {
    services: servicesWithAssignments,
    studios,
    producers: producersWithAssignments,
    availabilityRules,
    availabilityExceptions,
    bookings,
    communityPreferences,
    files,
    issues,
  }
}

function serviceAllowsStudio(service: BookingService, studioId: string) {
  if (!service.requires_studio) return false
  if (!service.studio_assignments_loaded) return false

  return service.assigned_studio_ids.includes(studioId)
}

function producerAllowsService(producer: Producer, serviceId: string) {
  if (!producer.assignments_loaded) return false

  return producer.assigned_service_ids.includes(serviceId)
}

function producerAllowsStudio(producer: Producer, studioId: string | null | undefined) {
  if (!studioId) return true
  if (!producer.assignments_loaded) return false

  return producer.assigned_studio_ids.includes(studioId)
}

function dedupeProducersForSelection(producers: Producer[]) {
  const orderedProducers = [...producers].sort((left, right) => {
    if (Boolean(left.user_id) !== Boolean(right.user_id)) return left.user_id ? -1 : 1

    const leftTokenCount = nameTokens(left.name).length
    const rightTokenCount = nameTokens(right.name).length
    if (leftTokenCount !== rightTokenCount) return rightTokenCount - leftTokenCount

    return left.name.localeCompare(right.name)
  })
  const uniqueProducers: Producer[] = []

  for (const producer of orderedProducers) {
    if (uniqueProducers.some((current) => namesLookLikeSameTeamMember(current.name, producer.name))) continue
    uniqueProducers.push(producer)
  }

  return uniqueProducers.sort((left, right) => left.name.localeCompare(right.name))
}

export function getProducersForServiceAndStudio(
  service: BookingService | null,
  studioId: string | null | undefined,
  producers: Producer[],
) {
  if (!service?.requires_producer) return []

  return dedupeProducersForSelection(producers.filter(
    (producer) =>
      producer.is_active &&
      producerAllowsService(producer, service.id) &&
      producerAllowsStudio(producer, studioId),
  ))
}

export function getStudiosForService(
  service: BookingService | null,
  studios: Studio[],
  producers: Producer[],
) {
  if (!service?.requires_studio) return []

  return studios
    .filter((studio) => studio.is_active && serviceAllowsStudio(service, studio.id))
    .filter((studio) => {
      if (!service.requires_producer) return true

      return getProducersForServiceAndStudio(service, studio.id, producers).length > 0
    })
}

export function serviceCanBeBooked(service: BookingService, studios: Studio[], producers: Producer[]) {
  const hasStudios = !service.requires_studio || getStudiosForService(service, studios, producers).length > 0
  const hasProducers =
    !service.requires_producer ||
    getProducersForServiceAndStudio(service, service.requires_studio ? undefined : null, producers).length > 0 ||
    getStudiosForService(service, studios, producers).some(
      (studio) => getProducersForServiceAndStudio(service, studio.id, producers).length > 0,
    )

  return hasStudios && hasProducers
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
  resources?: {
    producers: Producer[]
    studios: Studio[]
  },
) {
  const service = getServiceById(services, selection.serviceId)

  if (!service) return false
  if (service.requires_studio && !selection.studioId) return false
  if (service.requires_producer && !selection.producerId) return false
  if (resources && service.requires_studio) {
    const validStudio = getStudiosForService(service, resources.studios, resources.producers).some(
      (studio) => studio.id === selection.studioId,
    )

    if (!validStudio) return false
  }

  if (resources && service.requires_producer) {
    const validProducer = getProducersForServiceAndStudio(
      service,
      selection.studioId ?? null,
      resources.producers,
    ).some((producer) => producer.id === selection.producerId)

    if (!validProducer) return false
  }

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
  producers,
  rules,
  serviceId,
  services,
  studioId,
  studios,
}: BuildAvailableSlotsInput) {
  const dateKey = typeof date === 'string' ? date : toDateKey(date)
  const dateValue = typeof date === 'string' ? dateFromKey(date) : date
  const service = getServiceById(services, serviceId)

  if (
    !service ||
    !isBookingSelectionReady(
      services,
      { serviceId, studioId, producerId },
      studios && producers ? { studios, producers } : undefined,
    )
  ) {
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
  producers,
  rules,
  serviceId,
  services,
  studioId,
  studios,
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
      producers,
      date,
      excludePast: false,
      studios,
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
    p_limit: Math.min(Math.max(limit, 1), 5000),
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
  if (selection.producerId && row.producer_id === selection.producerId) return true
  if (selection.producerId && selection.studioId && !row.producer_id && row.studio_id === selection.studioId) return true
  if (!selection.producerId && selection.studioId && row.studio_id === selection.studioId) return true

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

  const { data, error: rpcError } = await supabase.rpc('create_booking_with_slots', {
    p_booking_date: input.bookingDate,
    p_client_id: input.clientId,
    p_discount_code: input.discountCode?.trim() || null,
    p_end_time: input.endTime,
    p_notes: input.notes,
    p_producer_id: input.producerId || null,
    p_selected_slots: input.selectedSlots,
    p_service_id: input.serviceId,
    p_start_time: input.startTime,
    p_studio_id: input.studioId || null,
  })

  if (!rpcError) {
    const row = ((data ?? []) as CreateBookingRow[])[0]
    if (!row) throw new Error('Booking response was empty.')

    return {
      id: row.id,
      total_amount: Number(row.total_amount ?? 0),
      deposit_amount: Number(row.deposit_amount ?? 0),
      deposit_amount_due: Number(row.deposit_amount_due ?? row.deposit_amount ?? 0),
      discount_amount: Number(row.discount_amount ?? 0),
      currency: row.currency ?? 'CLP',
      status: normalizeBookingStatus(row.status),
      payment_status: normalizePaymentStatus(row.payment_status),
      payment_provider: row.payment_provider ?? null,
      payment_reference: row.payment_reference ?? null,
      payment_validation_code: row.payment_validation_code ?? null,
      payment_checkout_url: row.payment_checkout_url ?? null,
      payment_hold_expires_at: row.payment_hold_expires_at ?? null,
    } satisfies CreateBookingResult
  }
  if (!isMissingOrIncompleteSchema(rpcError)) throw rpcError

  const requestedDiscountCode = input.discountCode?.trim()

  if (requestedDiscountCode) {
    throw new Error(
      'No se pudo crear la reserva con descuento porque el RPC create_booking_with_slots no esta disponible o el cache de esquema no esta actualizado. Aplica la migracion de reservas con descuentos antes de reintentar.',
    )
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

  if (!modernResult.error) {
    return {
      id: '',
      total_amount: 0,
      deposit_amount: 0,
      deposit_amount_due: 0,
      discount_amount: 0,
      currency: 'CLP',
      status: 'pending',
      payment_status: 'unpaid',
      payment_provider: null,
      payment_reference: null,
      payment_validation_code: null,
      payment_checkout_url: null,
      payment_hold_expires_at: null,
    } satisfies CreateBookingResult
  }
  throw modernResult.error
}

export async function previewBookingDiscount(input: {
  discountCode: string
  serviceId: string
  slotCount: number
}) {
  const { data, error } = await supabase.rpc('preview_booking_discount', {
    p_discount_code: input.discountCode.trim(),
    p_service_id: input.serviceId,
    p_slot_count: input.slotCount,
  })

  if (error) throw error

  const row = ((data ?? []) as DiscountPreviewRow[])[0]
  if (!row) throw new Error('Discount preview response was empty.')

  return {
    total_amount: Number(row.total_amount ?? 0),
    deposit_amount: Number(row.deposit_amount ?? 0),
    deposit_amount_due: Number(row.deposit_amount_due ?? row.deposit_amount ?? 0),
    discount_amount: Number(row.discount_amount ?? 0),
    discount_percent: row.discount_percent ?? null,
    currency: row.currency ?? 'CLP',
  } satisfies DiscountPreview
}

export async function cancelOwnBooking(bookingId: string) {
  const { error } = await supabase.rpc('cancel_own_booking', {
    p_booking_id: bookingId,
  })

  if (error) throw error
}

export async function updateDashboardCommunityPreferences(input: {
  acceptTerms?: boolean
  communityConsent?: boolean
}) {
  const { data, error } = await supabase.rpc('update_dashboard_community_preferences', {
    p_accept_terms: input.acceptTerms === true,
    p_community_consent:
      typeof input.communityConsent === 'boolean' ? input.communityConsent : null,
  })

  if (error) {
    if (isMissingOrIncompleteSchema(error)) return updateDashboardCommunityPreferencesFromProfile(input)
    throw error
  }

  const row = ((data ?? []) as CommunityPreferencesRow[])[0]
  if (!row) throw new Error('Community preferences response was empty.')

  return normalizeCommunityPreferences(row)
}

async function updateDashboardCommunityPreferencesFromProfile(input: {
  acceptTerms?: boolean
  communityConsent?: boolean
}) {
  const user = await getAuthenticatedProfileUser()
  const currentPreferences = await upsertOwnCommunityProfile(user)
  const now = new Date().toISOString()

  if (
    input.communityConsent === true &&
    !currentPreferences.terms_accepted &&
    input.acceptTerms !== true
  ) {
    throw new Error('TERMS_REQUIRED')
  }

  const patch: Partial<CommunityPreferences> = {
    email: readTrimmedText(user.email).toLowerCase(),
    updated_at: now,
  }

  if (input.acceptTerms === true) {
    patch.terms_accepted = true
    patch.terms_accepted_at = currentPreferences.terms_accepted_at ?? now
    patch.terms_source = currentPreferences.terms_source ?? 'dashboard'
  }

  if (typeof input.communityConsent === 'boolean') {
    patch.community_consent = input.communityConsent

    if (input.communityConsent) {
      patch.community_consent_at = currentPreferences.community_consent
        ? currentPreferences.community_consent_at ?? now
        : now
      patch.community_consent_source = 'dashboard'
      patch.community_consent_revoked_at = null
    } else {
      patch.community_consent_revoked_at = currentPreferences.community_consent
        ? now
        : currentPreferences.community_consent_revoked_at
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', user.id)
    .select(communityPreferencesColumns)
    .single()

  if (error) throw error

  return normalizeCommunityPreferences(data as CommunityPreferencesRow)
}

export async function createFileDownloadUrl(file: SharedFile) {
  const { data, error } = await supabase.storage
    .from(file.bucket)
    .createSignedUrl(file.storage_path, 60, { download: file.file_name })

  if (error) throw error

  return data.signedUrl
}
