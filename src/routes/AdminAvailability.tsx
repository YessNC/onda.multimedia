import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarClock,
  Clock3,
  FileUp,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  Upload,
  UsersRound,
  X,
} from 'lucide-react'
import AdminSignOutButton from '../components/admin/AdminSignOutButton'
import OndaSelect, { type OndaSelectOption } from '../components/shared/OndaSelect'
import CTAButton from '../components/shared/CTAButton'
import SectionTitle from '../components/shared/SectionTitle'
import { useI18n } from '../hooks/useI18n'
import { getActiveAdminMembership } from '../lib/adminAuth'
import {
  type AvailabilityException,
  type AvailabilityExceptionType,
  type AvailabilityRule,
  type Booking,
  type BookingService,
  type BookingStatus,
  type Producer,
  type Studio,
  formatMoney,
  namesLookLikeSameTeamMember,
  normalizeTime,
  paymentStatusClassName,
  statusClassName,
} from '../lib/dashboard'
import { sanitizeFileName } from '../lib/invitations'
import { supabaseAdmin as supabase } from '../lib/supabaseAdminClient'
import { cn } from '../lib/utils'

type MessageState = {
  tone: 'success' | 'error'
  text: string
}

type DeleteExceptionsScope = 'filtered' | 'all'

type DeleteExceptionsDialogState = {
  count: number
  scope: DeleteExceptionsScope
}

type BookingCancelDialogState = {
  booking: Booking
}

type BookingPermanentDeleteDialogState = {
  booking: Booking
}

type ProducerDeleteDialogState = {
  producer: Producer
}

type ServiceForm = {
  currency: string
  depositPercent: string
  id: string | null
  description: string
  durationMinutes: string
  isActive: boolean
  name: string
  pricePerSlot: string
  requiresProducer: boolean
  requiresStudio: boolean
  studioIds: string[]
}

type StudioForm = {
  id: string | null
  description: string
  isActive: boolean
  name: string
}

type ProducerForm = {
  id: string | null
  isActive: boolean
  name: string
  role: string
  roleDescription: string
  serviceIds: string[]
  specialty: string
  studioIds: string[]
  userId: string
}

type RuleForm = {
  groupId: string | null
  id: string | null
  ids: string[]
  endTime: string
  isActive: boolean
  producerId: string
  serviceId: string
  slotMinutes: string
  startTime: string
  studioId: string
  weekdays: string[]
}

type ExceptionForm = {
  groupId: string | null
  id: string | null
  ids: string[]
  endTime: string
  endDate: string
  exceptionDate: string
  isIndefinite: boolean
  producerId: string
  reason: string
  serviceId: string
  startTime: string
  studioId: string
  type: AvailabilityExceptionType
  weekdays: string[]
}

type BookingRow = {
  id: string
  client_id: string | null
  email: string | null
  service_id: string | null
  studio_id: string | null
  producer_id: string | null
  booking_date: string
  start_time: string
  end_time: string
  status: BookingStatus
  name: string | null
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
  payment_status: string | null
  payment_transaction_id: string | null
  payment_validation_code: string | null
}

type BookingProfileRow = {
  id: string
  full_name: string | null
}

type AuthUserOption = {
  email: string | null
  full_name: string | null
  id: string
}

type BookingServiceStudioAssignmentRow = {
  is_active?: boolean | null
  service_id: string | null
  studio_id: string | null
}

type ProducerStudioAssignmentRow = {
  is_active?: boolean | null
  producer_id: string | null
  studio_id: string | null
}

type ProducerServiceAssignmentRow = {
  is_active?: boolean | null
  producer_id: string | null
  service_id: string | null
}

type FileUploadForm = {
  description: string
  file: File | null
  fileType: string
  title: string
}

type DiscountCode = {
  id: string
  applies_to: string
  code: string
  created_by: string | null
  description: string | null
  discount_type: string
  discount_value: number
  is_active: boolean
  max_uses: number | null
  used_count: number
  valid_from: string | null
  valid_until: string | null
}

type DiscountForm = {
  id: string | null
  code: string
  description: string
  discountType: string
  discountValue: string
  isActive: boolean
  maxUses: string
  validFrom: string
  validUntil: string
}

type RuleGroup = {
  ids: string[]
  isActive: boolean
  key: string
  rule: AvailabilityRule
  weekdays: string[]
}

type ExceptionGroup = {
  dateFrom: string
  dateTo: string | null
  exception: AvailabilityException
  ids: string[]
  isIndefinite: boolean
  key: string
  weekdays: string[]
}

type ExceptionFilterQuery = {
  eq: (column: string, value: string) => ExceptionFilterQuery
  lte: (column: string, value: string) => ExceptionFilterQuery
  or: (filters: string) => ExceptionFilterQuery
  overlaps: (column: string, value: number[]) => ExceptionFilterQuery
}

const weekdayKeys = [
  { value: '0', labelKey: 'calendar.weekday.sunday' },
  { value: '1', labelKey: 'calendar.weekday.monday' },
  { value: '2', labelKey: 'calendar.weekday.tuesday' },
  { value: '3', labelKey: 'calendar.weekday.wednesday' },
  { value: '4', labelKey: 'calendar.weekday.thursday' },
  { value: '5', labelKey: 'calendar.weekday.friday' },
  { value: '6', labelKey: 'calendar.weekday.saturday' },
]
const allWeekdayValues = weekdayKeys.map((weekday) => weekday.value)
const workdayValues = ['1', '2', '3', '4', '5']
const weekendValues = ['0', '6']
const deleteConfirmationToken = 'ELIMINAR'

const bookingStatuses: BookingStatus[] = ['pending', 'confirmed', 'completed', 'cancelled', 'rejected']
const deliveryFileTypes = ['master', 'mix', 'premix', 'stem', 'beat', 'photo', 'video', 'reel', 'document', 'other']
const clientFilesBucket = 'client-files'

const inputClassName =
  'min-h-11 w-full min-w-0 rounded-md border border-onda-purple/20 bg-white/[0.82] px-3 py-2 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-500 focus:border-onda-purple focus:ring-2 focus:ring-onda-purple/25 dark:border-onda-lavender/20 dark:bg-white/10 dark:text-white dark:placeholder:text-onda-muted/70 dark:focus:border-onda-lavender dark:focus:ring-onda-purple/35'
const labelClassName = 'grid min-w-0 gap-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-600 dark:text-onda-muted'
const panelClassName = 'glass-panel min-w-0 rounded-lg bg-white/70 p-4 sm:p-5 dark:bg-onda-black/58'
const panelTitleClassName = 'font-display text-lg font-bold uppercase tracking-[0.12em] text-zinc-950 dark:text-white'
const primaryButtonClassName =
  'inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-md bg-onda-purple px-4 py-3 text-center font-display text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-onda-electric disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto'
const secondaryButtonClassName =
  'inline-flex min-h-10 items-center justify-center rounded-md border border-onda-purple/25 px-3 py-2 text-xs font-bold uppercase text-onda-purple transition hover:bg-onda-purple/10 dark:border-onda-lavender/25 dark:text-onda-lavender'
const dangerButtonClassName =
  'inline-flex min-h-10 items-center justify-center rounded-md border border-red-400/35 px-3 py-2 text-xs font-bold uppercase text-red-700 transition hover:bg-red-500/10 dark:text-red-100'
const checkboxLabelClassName = 'inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-onda-soft'
const listItemClassName =
  'rounded-md border border-onda-purple/12 bg-white/65 p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]'

const emptyServiceForm: ServiceForm = {
  currency: 'CLP',
  depositPercent: '50',
  id: null,
  description: '',
  durationMinutes: '60',
  isActive: true,
  name: '',
  pricePerSlot: '0',
  requiresProducer: false,
  requiresStudio: true,
  studioIds: [],
}

const emptyStudioForm: StudioForm = {
  id: null,
  description: '',
  isActive: true,
  name: '',
}

const emptyProducerForm: ProducerForm = {
  id: null,
  isActive: true,
  name: '',
  role: '',
  roleDescription: '',
  serviceIds: [],
  specialty: '',
  studioIds: [],
  userId: '',
}

const emptyRuleForm: RuleForm = {
  groupId: null,
  id: null,
  ids: [],
  endTime: '18:00',
  isActive: true,
  producerId: '',
  serviceId: '',
  slotMinutes: '60',
  startTime: '10:00',
  studioId: '',
  weekdays: workdayValues,
}

const emptyExceptionForm: ExceptionForm = {
  groupId: null,
  id: null,
  ids: [],
  endTime: '',
  endDate: '',
  exceptionDate: '',
  isIndefinite: false,
  producerId: '',
  reason: '',
  serviceId: '',
  startTime: '',
  studioId: '',
  type: 'blocked',
  weekdays: allWeekdayValues,
}

const emptyFileUploadForm: FileUploadForm = {
  description: '',
  file: null,
  fileType: 'master',
  title: '',
}

const emptyDiscountForm: DiscountForm = {
  id: null,
  code: '',
  description: '',
  discountType: 'percent',
  discountValue: '100',
  isActive: true,
  maxUses: '',
  validFrom: '',
  validUntil: '',
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Ocurrio un error inesperado.'
}

function getErrorCode(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code
    return typeof code === 'string' ? code : ''
  }

  return ''
}

function isAdminPermissionError(error: unknown) {
  const code = getErrorCode(error)
  const message = getErrorMessage(error).toLowerCase()

  return (
    code === '42501' ||
    message.includes('permission denied') ||
    message.includes('row-level security') ||
    message.includes('rls')
  )
}

function isMissingOrIncompleteSchema(error: unknown) {
  const code = getErrorCode(error)
  const message = getErrorMessage(error).toLowerCase()

  return (
    code === '42P01' ||
    code === '42703' ||
    code === 'PGRST202' ||
    code === 'PGRST204' ||
    code === 'PGRST205' ||
    message.includes('could not find the function') ||
    message.includes('schema cache') ||
    message.includes('column')
  )
}

function getAdminActionErrorMessage(error: unknown, permissionMessage: string) {
  const message = getErrorMessage(error)

  if (isAdminPermissionError(error)) {
    return `${permissionMessage} ${message}`
  }

  return message
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function getNameById<T extends { id: string; name: string }>(items: T[], id: string | null | undefined, fallback: string) {
  if (!id) return fallback
  return items.find((item) => item.id === id)?.name ?? fallback
}

function collectAssignmentIds<TRow extends object>(
  rows: TRow[],
  ownerKey: keyof TRow,
  targetKey: keyof TRow,
) {
  const idsByOwner = new Map<string, string[]>()

  for (const row of rows) {
    const ownerId = row[ownerKey]
    const targetId = row[targetKey]

    if (typeof ownerId !== 'string' || typeof targetId !== 'string') continue

    const currentIds = idsByOwner.get(ownerId) ?? []
    currentIds.push(targetId)
    idsByOwner.set(ownerId, currentIds)
  }

  return idsByOwner
}

function applyServiceStudioAssignments(
  services: BookingService[],
  rows: BookingServiceStudioAssignmentRow[],
  loaded: boolean,
) {
  const studiosByServiceId = collectAssignmentIds(rows, 'service_id', 'studio_id')

  return services.map((service) => ({
    ...service,
    assigned_studio_ids: loaded ? studiosByServiceId.get(service.id) ?? [] : [],
    studio_assignments_loaded: loaded,
  }))
}

function applyProducerAssignments(
  producers: Producer[],
  studioRows: ProducerStudioAssignmentRow[],
  serviceRows: ProducerServiceAssignmentRow[],
  loaded: boolean,
) {
  const studiosByProducerId = collectAssignmentIds(studioRows, 'producer_id', 'studio_id')
  const servicesByProducerId = collectAssignmentIds(serviceRows, 'producer_id', 'service_id')

  return producers.map((producer) => ({
    ...producer,
    assigned_service_ids: loaded ? servicesByProducerId.get(producer.id) ?? [] : [],
    assigned_studio_ids: loaded ? studiosByProducerId.get(producer.id) ?? [] : [],
    assignments_loaded: loaded,
  }))
}

function getNamesSummary<T extends { id: string; name: string }>(items: T[], selectedIds: string[], fallback: string) {
  const selectedIdSet = new Set(selectedIds)
  const names = items
    .filter((item) => selectedIdSet.has(item.id))
    .map((item) => item.name)

  return names.length > 0 ? names.join(', ') : fallback
}

function getBookingClientName(row: BookingRow, profilesById: Map<string, string>, fallback: string) {
  const profileName = row.client_id ? profilesById.get(row.client_id)?.trim() : ''

  return profileName || row.name?.trim() || row.email?.trim() || fallback
}

function getAuthUserLabel(user: AuthUserOption | null | undefined, fallback: string) {
  if (!user) return fallback
  return user.email?.trim() || user.full_name?.trim() || fallback
}

function getAuthUserDescription(user: AuthUserOption) {
  const name = user.full_name?.trim()
  const email = user.email?.trim()

  if (name && email) return name
  return name || undefined
}

function getLinkedUserLabel(userId: string | null | undefined, usersById: Map<string, AuthUserOption>, fallback: string) {
  if (!userId) return fallback
  const user = usersById.get(userId)
  return getAuthUserLabel(user, userId)
}

function dateFromKey(dateKey: string) {
  const [year = '0', month = '1', day = '1'] = dateKey.split('-')
  return new Date(Number(year), Number(month) - 1, Number(day))
}

function getWeekdayValue(dateKey: string) {
  return String(dateFromKey(dateKey).getDay())
}

function minutesFromFormTime(value: string) {
  const [hour = '0', minute = '0'] = normalizeTime(value).split(':')
  return Number(hour) * 60 + Number(minute)
}

function normalizeWeekdaySelection(values: string[]) {
  return [...new Set(values.filter((value) => allWeekdayValues.includes(value)))]
    .sort((left, right) => Number(left) - Number(right))
}

function weekdayNumbers(values: string[]) {
  return normalizeWeekdaySelection(values).map(Number)
}

function weekdaysFromNumbers(values: number[] | null | undefined, fallback: string[] = []) {
  const normalized = Array.isArray(values)
    ? values.map(String).filter((value) => allWeekdayValues.includes(value))
    : fallback

  return normalizeWeekdaySelection(normalized)
}

function arraysHaveSameValues(left: string[], right: string[]) {
  const normalizedLeft = normalizeWeekdaySelection(left)
  const normalizedRight = normalizeWeekdaySelection(right)

  return normalizedLeft.length === normalizedRight.length && normalizedLeft.every((value, index) => value === normalizedRight[index])
}

function getRuleWeekdays(rule: AvailabilityRule) {
  return weekdaysFromNumbers(rule.weekdays, [String(rule.weekday)])
}

function getExceptionWeekdays(exception: AvailabilityException) {
  return weekdaysFromNumbers(exception.weekdays, [getWeekdayValue(exception.exception_date)])
}

function getWeekdayGroupLabel(
  weekdays: string[],
  weekdayOptions: OndaSelectOption[],
  labels: {
    all: string
    weekend: string
    workdays: string
  },
) {
  const normalized = normalizeWeekdaySelection(weekdays)

  if (arraysHaveSameValues(normalized, allWeekdayValues)) return labels.all
  if (arraysHaveSameValues(normalized, workdayValues)) return labels.workdays
  if (arraysHaveSameValues(normalized, weekendValues)) return labels.weekend

  return normalized
    .map((weekday) => weekdayOptions.find((option) => option.value === weekday)?.label ?? weekday)
    .join(', ')
}

function getDaysBetween(leftDateKey: string, rightDateKey: string) {
  const left = dateFromKey(leftDateKey)
  const right = dateFromKey(rightDateKey)
  const millisecondsPerDay = 24 * 60 * 60 * 1000

  return Math.round((right.getTime() - left.getTime()) / millisecondsPerDay)
}

function createGroupId() {
  return globalThis.crypto.randomUUID()
}

function buildRuleGroups(rules: AvailabilityRule[]) {
  const groups = new Map<string, RuleGroup>()

  for (const rule of rules) {
    const key = JSON.stringify({
      endTime: normalizeTime(rule.end_time),
      isActive: rule.is_active,
      producerId: rule.producer_id ?? '',
      serviceId: rule.service_id ?? '',
      slotMinutes: rule.slot_minutes,
      startTime: normalizeTime(rule.start_time),
      studioId: rule.studio_id ?? '',
    })
    const group = groups.get(key)

    if (group) {
      group.ids.push(rule.id)
      group.weekdays = normalizeWeekdaySelection([...group.weekdays, ...getRuleWeekdays(rule)])
      continue
    }

    groups.set(key, {
      ids: [rule.id],
      isActive: rule.is_active,
      key,
      rule,
      weekdays: getRuleWeekdays(rule),
    })
  }

  return [...groups.values()].sort((left, right) => {
    const leftWeekday = Number(left.weekdays[0] ?? 0)
    const rightWeekday = Number(right.weekdays[0] ?? 0)

    if (leftWeekday !== rightWeekday) return leftWeekday - rightWeekday
    return normalizeTime(left.rule.start_time).localeCompare(normalizeTime(right.rule.start_time))
  })
}

function getExceptionBaseKey(exception: AvailabilityException) {
  return JSON.stringify({
    endTime: exception.end_time ? normalizeTime(exception.end_time) : '',
    producerId: exception.producer_id ?? '',
    reason: exception.reason ?? '',
    serviceId: exception.service_id ?? '',
    startTime: exception.start_time ? normalizeTime(exception.start_time) : '',
    studioId: exception.studio_id ?? '',
    type: exception.type,
  })
}

function buildExceptionGroupFromRows(rows: AvailabilityException[], key: string): ExceptionGroup {
  const first = rows[0]
  const dateFrom = rows.reduce((current, row) => (row.date_from < current ? row.date_from : current), first.date_from)
  const hasIndefinite = rows.some((row) => row.date_to === null)
  const dateTo = hasIndefinite
    ? null
    : rows.reduce((current, row) => {
        const nextDate = row.date_to ?? row.date_from
        return nextDate > current ? nextDate : current
      }, first.date_to ?? first.date_from)

  return {
    dateFrom,
    dateTo,
    exception: first,
    ids: rows.map((row) => row.id),
    isIndefinite: hasIndefinite,
    key,
    weekdays: normalizeWeekdaySelection(rows.flatMap(getExceptionWeekdays)),
  }
}

function buildExceptionGroups(exceptions: AvailabilityException[]) {
  const rangedGroups = new Map<string, AvailabilityException[]>()
  const legacyBuckets = new Map<string, AvailabilityException[]>()

  for (const exception of exceptions) {
    const weekdays = getExceptionWeekdays(exception)
    const isSingleDayLegacy =
      !exception.group_id &&
      exception.date_from === exception.exception_date &&
      exception.date_to === exception.exception_date &&
      weekdays.length === 1

    if (isSingleDayLegacy) {
      const key = getExceptionBaseKey(exception)
      legacyBuckets.set(key, [...(legacyBuckets.get(key) ?? []), exception])
      continue
    }

    const key = exception.group_id
      ? `group:${exception.group_id}`
      : JSON.stringify({
          base: getExceptionBaseKey(exception),
          dateFrom: exception.date_from,
          dateTo: exception.date_to ?? '',
          weekdays,
        })

    rangedGroups.set(key, [...(rangedGroups.get(key) ?? []), exception])
  }

  const groups = [...rangedGroups.entries()].map(([key, rows]) => buildExceptionGroupFromRows(rows, key))

  for (const [baseKey, rows] of legacyBuckets) {
    const sortedRows = [...rows].sort((left, right) => left.exception_date.localeCompare(right.exception_date))
    let segment: AvailabilityException[] = []

    for (const row of sortedRows) {
      const previous = segment[segment.length - 1]

      if (!previous || getDaysBetween(previous.exception_date, row.exception_date) <= 3) {
        segment.push(row)
      } else {
        groups.push(buildExceptionGroupFromRows(segment, `${baseKey}:${segment[0]?.exception_date ?? ''}`))
        segment = [row]
      }
    }

    if (segment.length > 0) {
      groups.push(buildExceptionGroupFromRows(segment, `${baseKey}:${segment[0]?.exception_date ?? ''}`))
    }
  }

  return groups.sort((left, right) => {
    if (left.dateFrom !== right.dateFrom) return right.dateFrom.localeCompare(left.dateFrom)
    return normalizeTime(left.exception.start_time).localeCompare(normalizeTime(right.exception.start_time))
  })
}

function mapBookingRows(
  rows: BookingRow[],
  services: BookingService[],
  studios: Studio[],
  producers: Producer[],
  profilesById: Map<string, string>,
  labels: {
    defaultProducer: string
    defaultService: string
    defaultStudio: string
    registeredClient: string
  },
): Booking[] {
  return rows.map((row) => ({
    ...row,
    start_time: normalizeTime(row.start_time),
    end_time: normalizeTime(row.end_time),
    client_name: getBookingClientName(row, profilesById, labels.registeredClient),
    service_name: getNameById(services, row.service_id, labels.defaultService),
    studio_name: row.studio_id ? getNameById(studios, row.studio_id, labels.defaultStudio) : null,
    producer_name: row.producer_id ? getNameById(producers, row.producer_id, labels.defaultProducer) : null,
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
    payment_status: (row.payment_status ?? null) as Booking['payment_status'],
    payment_transaction_id: row.payment_transaction_id ?? null,
    payment_validation_code: row.payment_validation_code ?? null,
  }))
}

export default function AdminAvailability() {
  const { language, t } = useI18n()
  const [services, setServices] = useState<BookingService[]>([])
  const [studios, setStudios] = useState<Studio[]>([])
  const [producers, setProducers] = useState<Producer[]>([])
  const [authUsers, setAuthUsers] = useState<AuthUserOption[]>([])
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([])
  const [rules, setRules] = useState<AvailabilityRule[]>([])
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<MessageState | null>(null)
  const [serviceForm, setServiceForm] = useState<ServiceForm>(emptyServiceForm)
  const [studioForm, setStudioForm] = useState<StudioForm>(emptyStudioForm)
  const [producerForm, setProducerForm] = useState<ProducerForm>(emptyProducerForm)
  const [discountForm, setDiscountForm] = useState<DiscountForm>(emptyDiscountForm)
  const [ruleForm, setRuleForm] = useState<RuleForm>(emptyRuleForm)
  const [exceptionForm, setExceptionForm] = useState<ExceptionForm>(emptyExceptionForm)
  const [userSearch, setUserSearch] = useState('')
  const [fileUploadBooking, setFileUploadBooking] = useState<Booking | null>(null)
  const [fileUploadForm, setFileUploadForm] = useState<FileUploadForm>(emptyFileUploadForm)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [bookingCancelDialog, setBookingCancelDialog] = useState<BookingCancelDialogState | null>(null)
  const [bookingPermanentDeleteDialog, setBookingPermanentDeleteDialog] =
    useState<BookingPermanentDeleteDialogState | null>(null)
  const [producerDeleteDialog, setProducerDeleteDialog] = useState<ProducerDeleteDialogState | null>(null)
  const [deleteExceptionsDialog, setDeleteExceptionsDialog] = useState<DeleteExceptionsDialogState | null>(null)
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('')
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null)
  const serviceOptions = useMemo<OndaSelectOption[]>(
    () => [
      { value: '', label: t('adminAvailability.select.service'), disabled: true },
      ...services.map((service) => ({ value: service.id, label: service.name })),
    ],
    [services, t],
  )
  const studioAssignmentOptions = useMemo(
    () => studios.filter((studio) => studio.is_active).map((studio) => ({ id: studio.id, label: studio.name })),
    [studios],
  )
  const serviceAssignmentOptions = useMemo(
    () => services.filter((service) => service.is_active).map((service) => ({ id: service.id, label: service.name })),
    [services],
  )
  const studioAnyOptions = useMemo<OndaSelectOption[]>(
    () => [
      { value: '', label: t('adminAvailability.anyStudio') },
      ...studios.map((studio) => ({ value: studio.id, label: studio.name })),
    ],
    [studios, t],
  )
  const producerAnyOptions = useMemo<OndaSelectOption[]>(
    () => [
      { value: '', label: t('adminAvailability.anyProducer') },
      ...producers.map((producer) => ({ value: producer.id, label: producer.name })),
    ],
    [producers, t],
  )
  const weekdayOptions = useMemo<OndaSelectOption[]>(
    () => weekdayKeys.map((weekday) => ({ value: weekday.value, label: t(weekday.labelKey) })),
    [t],
  )
  const exceptionTypeOptions = useMemo<OndaSelectOption[]>(
    () => [
      { value: 'blocked', label: t('adminAvailability.exception.blockedAction') },
      { value: 'available', label: t('adminAvailability.exception.availableAction') },
    ],
    [t],
  )
  const bookingStatusOptions = useMemo<OndaSelectOption[]>(
    () => bookingStatuses.map((status) => ({ value: status, label: t(`dashboard.status.${status}`) })),
    [t],
  )
  const authUsersById = useMemo(() => new Map(authUsers.map((user) => [user.id, user])), [authUsers])
  const linkedUserIds = useMemo(
    () =>
      new Set(
        producers
          .filter((producer) => producer.user_id && producer.id !== producerForm.id)
          .map((producer) => producer.user_id as string),
      ),
    [producerForm.id, producers],
  )
  const filteredAuthUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase()
    if (!query) return authUsers

    return authUsers.filter((user) =>
      [user.email, user.full_name, user.id]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query)),
    )
  }, [authUsers, userSearch])
  const authUserOptions = useMemo<OndaSelectOption[]>(
    () => [
      { value: '', label: t('adminAvailability.noLinkedUser') },
      ...filteredAuthUsers.map((user) => ({
        value: user.id,
        label: getAuthUserLabel(user, user.id),
        description: linkedUserIds.has(user.id)
          ? t('adminAvailability.userAlreadyLinked')
          : getAuthUserDescription(user),
        disabled: linkedUserIds.has(user.id),
      })),
    ],
    [filteredAuthUsers, linkedUserIds, t],
  )
  const selectedLinkedUserIsDuplicate = Boolean(producerForm.userId && linkedUserIds.has(producerForm.userId))
  const selectedProducerNameLooksDuplicate = useMemo(() => {
    const nextName = producerForm.name.trim()

    if (!nextName) return false

    return producers.some(
      (producer) =>
        producer.id !== producerForm.id &&
        namesLookLikeSameTeamMember(producer.name, nextName),
    )
  }, [producerForm.id, producerForm.name, producers])
  const deliveryTypeOptions = useMemo<OndaSelectOption[]>(
    () => deliveryFileTypes.map((fileType) => ({ value: fileType, label: t(`dashboard.files.filter.${fileType}`) })),
    [t],
  )
  const discountTypeOptions = useMemo<OndaSelectOption[]>(
    () => [
      { value: 'percent', label: t('adminAvailability.discounts.percent') },
      { value: 'fixed', label: t('adminAvailability.discounts.fixed') },
    ],
    [t],
  )
  const ruleGroups = useMemo(() => buildRuleGroups(rules), [rules])
  const exceptionGroups = useMemo(() => buildExceptionGroups(exceptions), [exceptions])
  const selectedRuleWeekdays = normalizeWeekdaySelection(ruleForm.weekdays ?? [])
  const selectedExceptionWeekdays = normalizeWeekdaySelection(exceptionForm.weekdays ?? [])

  const loadData = useCallback(async ({ clearMessage = true }: { clearMessage?: boolean } = {}) => {
    setIsLoading(true)
    if (clearMessage) setMessage(null)

    try {
      const currentUserResult = await supabase.auth.getUser()
      const currentUser = currentUserResult.data.user
      const nextIsOwner = currentUser?.email?.trim().toLowerCase() === 'contacto@ondamultimedia.com'

      if (currentUserResult.error) throw currentUserResult.error

      setIsOwner(nextIsOwner)
      setOwnerUserId(currentUser?.id ?? null)

      const [
        servicesResult,
        studiosResult,
        producersResult,
        rulesResult,
        exceptionsResult,
        bookingsResult,
        serviceStudiosResult,
        producerStudiosResult,
        producerServicesResult,
      ] =
        await Promise.all([
          supabase
            .from('booking_services')
            .select('id, name, description, duration_minutes, price_per_slot, currency, deposit_percent, requires_studio, requires_producer, is_active')
            .order('name', { ascending: true }),
          supabase.from('studios').select('id, name, slug, description, is_active').order('name', { ascending: true }),
          supabase
            .from('producers')
            .select('id, name, specialty, role, role_description, user_id, is_active')
            .order('name', { ascending: true }),
          supabase
            .from('availability_rules')
            .select('id, group_id, service_id, studio_id, producer_id, weekday, weekdays, start_time, end_time, slot_minutes, is_active')
            .order('weekday', { ascending: true })
            .order('start_time', { ascending: true }),
          supabase
            .from('availability_exceptions')
            .select('id, group_id, service_id, studio_id, producer_id, exception_date, date_from, date_to, weekdays, start_time, end_time, type, reason')
            .order('exception_date', { ascending: false })
            .limit(80),
          supabase
            .from('bookings')
            .select('id, client_id, service_id, studio_id, producer_id, booking_date, start_time, end_time, status, notes, name, email, total_hours, total_amount, deposit_amount, deposit_amount_before_discount, deposit_amount_due, deposit_percent, discount_amount, discount_code, discount_percent, currency, paid_at, payment_hold_expires_at, payment_provider, payment_reference, payment_status, payment_transaction_id, payment_validation_code')
            .order('booking_date', { ascending: false })
            .order('start_time', { ascending: true })
            .limit(120),
          supabase
            .from('booking_service_studios')
            .select('service_id, studio_id, is_active')
            .eq('is_active', true),
          supabase
            .from('producer_studios')
            .select('producer_id, studio_id, is_active')
            .eq('is_active', true),
          supabase
            .from('producer_services')
            .select('producer_id, service_id, is_active')
            .eq('is_active', true),
        ])

      const firstError =
        servicesResult.error ??
        studiosResult.error ??
        producersResult.error ??
        rulesResult.error ??
        exceptionsResult.error ??
        bookingsResult.error ??
        (!serviceStudiosResult.error || isMissingOrIncompleteSchema(serviceStudiosResult.error) ? null : serviceStudiosResult.error) ??
        (!producerStudiosResult.error || isMissingOrIncompleteSchema(producerStudiosResult.error) ? null : producerStudiosResult.error) ??
        (!producerServicesResult.error || isMissingOrIncompleteSchema(producerServicesResult.error) ? null : producerServicesResult.error)

      if (firstError) throw firstError

      const assignmentTablesLoaded =
        !serviceStudiosResult.error &&
        !producerStudiosResult.error &&
        !producerServicesResult.error
      const nextServices = applyServiceStudioAssignments(
        (servicesResult.data ?? []) as BookingService[],
        (serviceStudiosResult.data ?? []) as BookingServiceStudioAssignmentRow[],
        assignmentTablesLoaded,
      )
      const nextStudios = (studiosResult.data ?? []) as Studio[]
      const nextProducers = applyProducerAssignments(
        (producersResult.data ?? []) as Producer[],
        (producerStudiosResult.data ?? []) as ProducerStudioAssignmentRow[],
        (producerServicesResult.data ?? []) as ProducerServiceAssignmentRow[],
        assignmentTablesLoaded,
      )
      const bookingRows = (bookingsResult.data ?? []) as BookingRow[]
      const clientIds = [
        ...new Set(bookingRows.map((booking) => booking.client_id).filter((clientId): clientId is string => Boolean(clientId))),
      ]
      const profilesById = new Map<string, string>()

      if (clientIds.length > 0) {
        const { data: profileRows, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', clientIds)

        if (profilesError) throw profilesError

        for (const profile of (profileRows ?? []) as BookingProfileRow[]) {
          const profileName = profile.full_name?.trim()

          if (profileName) {
            profilesById.set(profile.id, profileName)
          }
        }
      }

      setServices(nextServices)
      setStudios(nextStudios)
      setProducers(nextProducers)
      const authUsersResult = await supabase.rpc('list_auth_users_for_admin')

      if (!authUsersResult.error) {
        setAuthUsers((authUsersResult.data ?? []) as AuthUserOption[])
      } else if (isMissingOrIncompleteSchema(authUsersResult.error)) {
        setAuthUsers([])
      } else {
        throw authUsersResult.error
      }

      if (nextIsOwner) {
        const discountCodesResult = await supabase
          .from('discount_codes')
          .select('id, code, description, discount_type, discount_value, applies_to, max_uses, used_count, valid_from, valid_until, is_active, created_by')
          .order('created_at', { ascending: false })

        if (discountCodesResult.error) throw discountCodesResult.error
        setDiscountCodes((discountCodesResult.data ?? []) as DiscountCode[])
      } else {
        setDiscountCodes([])
      }

      setRules((rulesResult.data ?? []) as AvailabilityRule[])
      setExceptions((exceptionsResult.data ?? []) as AvailabilityException[])
      setBookings(
        mapBookingRows(bookingRows, nextServices, nextStudios, nextProducers, profilesById, {
          defaultProducer: t('adminAvailability.responsible'),
          defaultService: t('adminAvailability.defaultBooking'),
          defaultStudio: t('dashboard.studio'),
          registeredClient: t('adminAvailability.registeredClient'),
        }),
      )
    } catch (error) {
      setMessage({
        tone: 'error',
        text: `${getErrorMessage(error)}. ${t('adminAvailability.error.applyMigrations')}`,
      })
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadData])

  const stats = useMemo(
    () => [
      { label: t('adminAvailability.stats.services'), value: services.length, icon: Sparkles },
      { label: t('adminAvailability.stats.studios'), value: studios.filter((studio) => studio.is_active).length, icon: Building2 },
      { label: t('adminAvailability.stats.producers'), value: producers.filter((producer) => producer.is_active).length, icon: UsersRound },
      { label: t('adminAvailability.stats.rules'), value: ruleGroups.filter((group) => group.isActive).length, icon: Clock3 },
    ],
    [producers, ruleGroups, services.length, studios, t],
  )

  async function runAction(actionKey: string, task: () => Promise<void>, successMessage: string) {
    setBusyKey(actionKey)
    setMessage(null)

    try {
      await task()
      setMessage({ tone: 'success', text: successMessage })
      await loadData({ clearMessage: false })
    } catch (error) {
      setMessage({ tone: 'error', text: getAdminActionErrorMessage(error, t('adminAvailability.error.adminPermission')) })
    } finally {
      setBusyKey(null)
    }
  }

  function editService(service: BookingService) {
    setServiceForm({
      currency: service.currency ?? 'CLP',
      depositPercent: String(service.deposit_percent ?? 50),
      id: service.id,
      description: service.description ?? '',
      durationMinutes: String(service.duration_minutes),
      isActive: service.is_active,
      name: service.name,
      pricePerSlot: String(service.price_per_slot ?? 0),
      requiresProducer: service.requires_producer,
      requiresStudio: service.requires_studio,
      studioIds: service.assigned_studio_ids ?? [],
    })
  }

  function editStudio(studio: Studio) {
    setStudioForm({
      id: studio.id,
      description: studio.description ?? '',
      isActive: studio.is_active,
      name: studio.name,
    })
  }

  function editProducer(producer: Producer) {
    setUserSearch('')
    setProducerForm({
      id: producer.id,
      isActive: producer.is_active,
      name: producer.name,
      role: producer.role ?? '',
      roleDescription: producer.role_description ?? '',
      serviceIds: producer.assigned_service_ids ?? [],
      specialty: producer.specialty ?? '',
      studioIds: producer.assigned_studio_ids ?? [],
      userId: producer.user_id ?? '',
    })
  }

  function editRule(group: RuleGroup) {
    const { rule } = group

    setRuleForm({
      groupId: rule.group_id,
      id: rule.id,
      ids: group.ids,
      endTime: normalizeTime(rule.end_time),
      isActive: rule.is_active,
      producerId: rule.producer_id ?? '',
      serviceId: rule.service_id ?? '',
      slotMinutes: String(rule.slot_minutes),
      startTime: normalizeTime(rule.start_time),
      studioId: rule.studio_id ?? '',
      weekdays: group.weekdays,
    })
  }

  function editException(group: ExceptionGroup) {
    const { exception } = group

    setExceptionForm({
      groupId: exception.group_id,
      id: exception.id,
      ids: group.ids,
      endTime: exception.end_time ? normalizeTime(exception.end_time) : '',
      endDate: group.dateTo ?? '',
      exceptionDate: group.dateFrom,
      isIndefinite: group.isIndefinite,
      producerId: exception.producer_id ?? '',
      reason: exception.reason ?? '',
      serviceId: exception.service_id ?? '',
      startTime: exception.start_time ? normalizeTime(exception.start_time) : '',
      studioId: exception.studio_id ?? '',
      type: exception.type,
      weekdays: group.weekdays,
    })
  }

  async function syncServiceStudioAssignments(serviceId: string, studioIds: string[]) {
    const deactivateResult = await supabase
      .from('booking_service_studios')
      .update({ is_active: false })
      .eq('service_id', serviceId)

    if (deactivateResult.error) throw deactivateResult.error

    if (studioIds.length === 0) return

    const upsertResult = await supabase
      .from('booking_service_studios')
      .upsert(
        studioIds.map((studioId) => ({
          is_active: true,
          service_id: serviceId,
          studio_id: studioId,
        })),
        { onConflict: 'service_id,studio_id' },
      )

    if (upsertResult.error) throw upsertResult.error
  }

  async function syncProducerStudioAssignments(producerId: string, studioIds: string[]) {
    const deactivateResult = await supabase
      .from('producer_studios')
      .update({ is_active: false })
      .eq('producer_id', producerId)

    if (deactivateResult.error) throw deactivateResult.error

    if (studioIds.length === 0) return

    const upsertResult = await supabase
      .from('producer_studios')
      .upsert(
        studioIds.map((studioId) => ({
          is_active: true,
          producer_id: producerId,
          studio_id: studioId,
        })),
        { onConflict: 'producer_id,studio_id' },
      )

    if (upsertResult.error) throw upsertResult.error
  }

  async function syncProducerServiceAssignments(producerId: string, serviceIds: string[]) {
    const deactivateResult = await supabase
      .from('producer_services')
      .update({ is_active: false })
      .eq('producer_id', producerId)

    if (deactivateResult.error) throw deactivateResult.error

    if (serviceIds.length === 0) return

    const upsertResult = await supabase
      .from('producer_services')
      .upsert(
        serviceIds.map((serviceId) => ({
          is_active: true,
          producer_id: producerId,
          service_id: serviceId,
        })),
        { onConflict: 'producer_id,service_id' },
      )

    if (upsertResult.error) throw upsertResult.error
  }

  function saveService(event: FormEvent) {
    event.preventDefault()
    const payload = {
      currency: serviceForm.currency.trim().toUpperCase() || 'CLP',
      deposit_percent: Number(serviceForm.depositPercent),
      description: serviceForm.description.trim() || null,
      duration_minutes: Number(serviceForm.durationMinutes),
      is_active: serviceForm.isActive,
      name: serviceForm.name.trim(),
      price_per_slot: Number(serviceForm.pricePerSlot),
      requires_producer: serviceForm.requiresProducer,
      requires_studio: serviceForm.requiresStudio,
    }

    void runAction(
      'service',
      async () => {
        let serviceId = serviceForm.id
        const result = serviceId
          ? await supabase.from('booking_services').update(payload).eq('id', serviceId)
          : await supabase.from('booking_services').insert(payload).select('id').single()

        if (result.error) throw result.error
        if (!serviceId) {
          serviceId = (result.data as { id?: string } | null)?.id ?? null
        }

        if (!serviceId) throw new Error(t('adminAvailability.error.updateNotApplied'))

        await syncServiceStudioAssignments(serviceId, serviceForm.requiresStudio ? serviceForm.studioIds : [])
        setServiceForm(emptyServiceForm)
      },
      serviceForm.id ? t('adminAvailability.message.serviceUpdated') : t('adminAvailability.message.serviceCreated'),
    )
  }

  function saveStudio(event: FormEvent) {
    event.preventDefault()
    const payload = {
      description: studioForm.description.trim() || null,
      is_active: studioForm.isActive,
      name: studioForm.name.trim(),
      slug: slugify(studioForm.name),
    }

    void runAction(
      'studio',
      async () => {
        const result = studioForm.id
          ? await supabase.from('studios').update(payload).eq('id', studioForm.id)
          : await supabase.from('studios').insert(payload)

        if (result.error) throw result.error
        setStudioForm(emptyStudioForm)
      },
      studioForm.id ? t('adminAvailability.message.studioUpdated') : t('adminAvailability.message.studioCreated'),
    )
  }

  function saveProducer(event: FormEvent) {
    event.preventDefault()
    if (selectedLinkedUserIsDuplicate) {
      setMessage({ tone: 'error', text: t('adminAvailability.error.userAlreadyLinked') })
      return
    }

    if (selectedProducerNameLooksDuplicate) {
      setMessage({ tone: 'error', text: t('adminAvailability.error.similarProducerExists') })
      return
    }

    const payload = {
      is_active: producerForm.isActive,
      name: producerForm.name.trim(),
      role: producerForm.role.trim() || null,
      role_description: producerForm.roleDescription.trim() || null,
      specialty: producerForm.specialty.trim() || null,
      user_id: producerForm.userId || null,
    }

    void runAction(
      'producer',
      async () => {
        let producerId = producerForm.id
        const result = producerId
          ? await supabase.from('producers').update(payload).eq('id', producerId)
          : await supabase.from('producers').insert(payload).select('id').single()

        if (result.error) throw result.error
        if (!producerId) {
          producerId = (result.data as { id?: string } | null)?.id ?? null
        }

        if (!producerId) throw new Error(t('adminAvailability.error.updateNotApplied'))

        await syncProducerStudioAssignments(producerId, producerForm.studioIds)
        await syncProducerServiceAssignments(producerId, producerForm.serviceIds)
        setProducerForm(emptyProducerForm)
        setUserSearch('')
      },
      producerForm.id ? t('adminAvailability.message.producerUpdated') : t('adminAvailability.message.producerCreated'),
    )
  }

  function editDiscountCode(discountCode: DiscountCode) {
    setDiscountForm({
      id: discountCode.id,
      code: discountCode.code,
      description: discountCode.description ?? '',
      discountType: discountCode.discount_type,
      discountValue: String(discountCode.discount_value ?? 0),
      isActive: discountCode.is_active,
      maxUses: discountCode.max_uses === null ? '' : String(discountCode.max_uses),
      validFrom: discountCode.valid_from ? discountCode.valid_from.slice(0, 16) : '',
      validUntil: discountCode.valid_until ? discountCode.valid_until.slice(0, 16) : '',
    })
  }

  function saveDiscountCode(event: FormEvent) {
    event.preventDefault()

    const payload = {
      applies_to: 'deposit',
      code: discountForm.code.trim().toUpperCase(),
      created_by: ownerUserId,
      description: discountForm.description.trim() || null,
      discount_type: discountForm.discountType,
      discount_value: Number(discountForm.discountValue),
      is_active: discountForm.isActive,
      max_uses: discountForm.maxUses ? Number(discountForm.maxUses) : null,
      valid_from: discountForm.validFrom || null,
      valid_until: discountForm.validUntil || null,
    }

    void runAction(
      'discount-code',
      async () => {
        if (!isOwner) throw new Error(t('adminAvailability.discounts.ownerOnly'))

        const result = discountForm.id
          ? await supabase.from('discount_codes').update(payload).eq('id', discountForm.id)
          : await supabase.from('discount_codes').insert(payload)

        if (result.error) throw result.error
        setDiscountForm(emptyDiscountForm)
      },
      discountForm.id ? t('adminAvailability.discounts.updated') : t('adminAvailability.discounts.created'),
    )
  }

  function toggleDiscountCode(discountCode: DiscountCode) {
    void runAction(
      `discount-code-${discountCode.id}`,
      async () => {
        if (!isOwner) throw new Error(t('adminAvailability.discounts.ownerOnly'))

        const result = await supabase
          .from('discount_codes')
          .update({ is_active: !discountCode.is_active })
          .eq('id', discountCode.id)

        if (result.error) throw result.error
      },
      discountCode.is_active ? t('adminAvailability.discounts.deactivated') : t('adminAvailability.discounts.activated'),
    )
  }

  function saveRule(event: FormEvent) {
    event.preventDefault()
    if (!ruleForm.serviceId) {
      setMessage({ tone: 'error', text: t('adminAvailability.error.serviceRequired') })
      return
    }

    if (selectedRuleWeekdays.length === 0) {
      setMessage({ tone: 'error', text: t('adminAvailability.error.weekdaysRequired') })
      return
    }

    if (minutesFromFormTime(ruleForm.endTime) <= minutesFromFormTime(ruleForm.startTime)) {
      setMessage({ tone: 'error', text: t('adminAvailability.error.invalidTimeRange') })
      return
    }

    const weekdays = weekdayNumbers(selectedRuleWeekdays)
    const payload = {
      end_time: ruleForm.endTime,
      group_id: ruleForm.groupId ?? createGroupId(),
      is_active: ruleForm.isActive,
      producer_id: ruleForm.producerId || null,
      service_id: ruleForm.serviceId || null,
      slot_minutes: Number(ruleForm.slotMinutes),
      start_time: ruleForm.startTime,
      studio_id: ruleForm.studioId || null,
      weekday: weekdays[0],
      weekdays,
    }
    const editIds = ruleForm.ids.length > 0 ? ruleForm.ids : ruleForm.id ? [ruleForm.id] : []

    void runAction(
      'rule',
      async () => {
        const [primaryId, ...extraIds] = editIds
        const result = primaryId
          ? await supabase.from('availability_rules').update(payload).eq('id', primaryId)
          : await supabase.from('availability_rules').insert(payload)

        if (result.error) throw result.error

        if (extraIds.length > 0) {
          const deleteResult = await supabase.from('availability_rules').delete().in('id', extraIds)
          if (deleteResult.error) throw deleteResult.error
        }

        setRuleForm({ ...emptyRuleForm, serviceId: ruleForm.serviceId })
      },
      ruleForm.id ? t('adminAvailability.message.ruleUpdated') : t('adminAvailability.message.ruleCreated'),
    )
  }

  function saveException(event: FormEvent) {
    event.preventDefault()
    if (!exceptionForm.serviceId) {
      setMessage({ tone: 'error', text: t('adminAvailability.error.serviceRequired') })
      return
    }

    if (!exceptionForm.exceptionDate) {
      setMessage({ tone: 'error', text: t('adminAvailability.error.startDateRequired') })
      return
    }

    const finalDate = exceptionForm.isIndefinite ? null : exceptionForm.endDate || exceptionForm.exceptionDate
    if (finalDate && dateFromKey(finalDate) < dateFromKey(exceptionForm.exceptionDate)) {
      setMessage({ tone: 'error', text: t('adminAvailability.error.invalidDateRange') })
      return
    }

    if ((exceptionForm.startTime && !exceptionForm.endTime) || (!exceptionForm.startTime && exceptionForm.endTime)) {
      setMessage({ tone: 'error', text: t('adminAvailability.error.completeTimeRange') })
      return
    }

    if (
      exceptionForm.startTime &&
      exceptionForm.endTime &&
      minutesFromFormTime(exceptionForm.endTime) <= minutesFromFormTime(exceptionForm.startTime)
    ) {
      setMessage({ tone: 'error', text: t('adminAvailability.error.invalidTimeRange') })
      return
    }

    if (selectedExceptionWeekdays.length === 0) {
      setMessage({ tone: 'error', text: t('adminAvailability.error.noDatesInRange') })
      return
    }

    const payload = {
      date_from: exceptionForm.exceptionDate,
      date_to: finalDate,
      end_time: exceptionForm.endTime || null,
      exception_date: exceptionForm.exceptionDate,
      group_id: exceptionForm.groupId ?? createGroupId(),
      producer_id: exceptionForm.producerId || null,
      reason: exceptionForm.reason.trim() || null,
      service_id: exceptionForm.serviceId || null,
      start_time: exceptionForm.startTime || null,
      studio_id: exceptionForm.studioId || null,
      type: exceptionForm.type,
      weekdays: weekdayNumbers(selectedExceptionWeekdays),
    }
    const editIds = exceptionForm.ids.length > 0 ? exceptionForm.ids : exceptionForm.id ? [exceptionForm.id] : []

    void runAction(
      'exception',
      async () => {
        const [primaryId, ...extraIds] = editIds
        const result = primaryId
          ? await supabase
              .from('availability_exceptions')
              .update(payload)
              .eq('id', primaryId)
          : await supabase
              .from('availability_exceptions')
              .insert(payload)

        if (result.error) throw result.error

        if (extraIds.length > 0) {
          const deleteResult = await supabase.from('availability_exceptions').delete().in('id', extraIds)
          if (deleteResult.error) throw deleteResult.error
        }

        setExceptionForm(emptyExceptionForm)
      },
      exceptionForm.id
        ? t('adminAvailability.message.exceptionUpdated')
        : t('adminAvailability.message.exceptionCreated'),
    )
  }

  function isRelatedProducerDeleteError(error: unknown) {
    const code = getErrorCode(error)
    const message = getErrorMessage(error).toLowerCase()

    return (
      code === '23503' ||
      message.includes('team_member_has_related_data') ||
      message.includes('related data') ||
      message.includes('associated data')
    )
  }

  function openProducerDeleteDialog(producer: Producer) {
    if (!isOwner || producer.user_id) return

    setMessage(null)
    setProducerDeleteDialog({ producer })
  }

  function confirmDeleteProducer(event: FormEvent) {
    event.preventDefault()

    const producer = producerDeleteDialog?.producer
    if (!producer) return

    void (async () => {
      setBusyKey(`delete-producer-${producer.id}`)
      setMessage(null)

      try {
        await assertActiveAdmin()

        if (!isOwner) throw new Error(t('adminAvailability.error.adminPermission'))

        const result = await supabase.rpc('delete_team_member_if_safe', {
          p_producer_id: producer.id,
        })

        if (result.error) throw result.error

        if (producerForm.id === producer.id) {
          setProducerForm(emptyProducerForm)
          setUserSearch('')
        }

        setProducerDeleteDialog(null)
        setMessage({ tone: 'success', text: t('adminAvailability.message.producerDeleted') })
        await loadData({ clearMessage: false })
      } catch (error) {
        setMessage({
          tone: 'error',
          text: isRelatedProducerDeleteError(error)
            ? t('adminAvailability.producers.deleteRelatedData')
            : t('adminAvailability.error.deleteProducer'),
        })
      } finally {
        setBusyKey(null)
      }
    })()
  }

  function toggleActive(tableName: 'booking_services' | 'studios' | 'producers' | 'availability_rules', id: string, active: boolean) {
    void runAction(
      `${tableName}-${id}`,
      async () => {
        const result = await supabase
          .from(tableName)
          .update({ is_active: !active })
          .eq('id', id)
          .select('id, is_active')
          .maybeSingle()

        if (result.error) throw result.error
        if (!result.data) throw new Error(t('adminAvailability.error.updateNotApplied'))
      },
      active ? t('adminAvailability.message.deactivated') : t('adminAvailability.message.activated'),
    )
  }

  function toggleRuleGroup(group: RuleGroup) {
    void runAction(
      `availability-rules-${group.key}`,
      async () => {
        const result = await supabase
          .from('availability_rules')
          .update({ is_active: !group.isActive })
          .in('id', group.ids)
          .select('id, is_active')

        if (result.error) throw result.error
        if ((result.data ?? []).length === 0) throw new Error(t('adminAvailability.error.updateNotApplied'))
      },
      group.isActive ? t('adminAvailability.message.deactivated') : t('adminAvailability.message.activated'),
    )
  }

  function deleteException(group: ExceptionGroup) {
    void runAction(
      `delete-exception-${group.key}`,
      async () => {
        const result = await supabase.from('availability_exceptions').delete().in('id', group.ids)
        if (result.error) throw result.error
      },
      t('adminAvailability.message.exceptionDeleted'),
    )
  }

  function hasSelectedExceptionDeleteFilters() {
    return Boolean(
      exceptionForm.serviceId ||
        exceptionForm.studioId ||
        exceptionForm.producerId ||
        exceptionForm.exceptionDate,
    )
  }

  function getSelectedExceptionDeleteRange() {
    if (!exceptionForm.exceptionDate) return null

    const finalDate = exceptionForm.isIndefinite ? null : exceptionForm.endDate || exceptionForm.exceptionDate

    if (finalDate && dateFromKey(finalDate) < dateFromKey(exceptionForm.exceptionDate)) {
      throw new Error(t('adminAvailability.error.invalidDateRange'))
    }

    return {
      dateFrom: exceptionForm.exceptionDate,
      dateTo: finalDate,
    }
  }

  function applyExceptionFilters<T>(query: T): T {
    let nextQuery = query as unknown as ExceptionFilterQuery
    const range = getSelectedExceptionDeleteRange()

    if (exceptionForm.serviceId) nextQuery = nextQuery.eq('service_id', exceptionForm.serviceId)
    if (exceptionForm.studioId) nextQuery = nextQuery.eq('studio_id', exceptionForm.studioId)
    if (exceptionForm.producerId) nextQuery = nextQuery.eq('producer_id', exceptionForm.producerId)

    if (range) {
      if (range.dateTo) nextQuery = nextQuery.lte('date_from', range.dateTo)
      nextQuery = nextQuery.or(`date_to.is.null,date_to.gte.${range.dateFrom}`)

      if (selectedExceptionWeekdays.length > 0 && !arraysHaveSameValues(selectedExceptionWeekdays, allWeekdayValues)) {
        nextQuery = nextQuery.overlaps('weekdays', weekdayNumbers(selectedExceptionWeekdays))
      }
    }

    return nextQuery as unknown as T
  }

  async function assertActiveAdmin() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) throw error
    if (!user) throw new Error(t('adminAvailability.error.adminPermission'))

    const membership = await getActiveAdminMembership(user)

    if (!membership) throw new Error(t('adminAvailability.error.adminPermission'))
  }

  async function countAvailabilityExceptions(scope: DeleteExceptionsScope) {
    let query = supabase.from('availability_exceptions').select('id', { count: 'exact', head: true })

    if (scope === 'filtered') {
      query = applyExceptionFilters(query)
    }

    const { count, error } = await query

    if (error) throw error

    return count ?? 0
  }

  async function openDeleteExceptionsDialog(scope: DeleteExceptionsScope) {
    setMessage(null)

    if (scope === 'filtered' && !hasSelectedExceptionDeleteFilters()) {
      setMessage({ tone: 'error', text: t('adminAvailability.error.deleteFilterRequired') })
      return
    }

    setBusyKey(`delete-exceptions-${scope}-count`)

    try {
      await assertActiveAdmin()
      const count = await countAvailabilityExceptions(scope)
      setDeleteAcknowledged(false)
      setDeleteConfirmationInput('')
      setDeleteExceptionsDialog({ count, scope })
    } catch (error) {
      setMessage({
        tone: 'error',
        text: isAdminPermissionError(error)
          ? t('adminAvailability.error.deleteBlocks')
          : getErrorMessage(error),
      })
    } finally {
      setBusyKey(null)
    }
  }

  async function deleteAvailabilityExceptions(scope: DeleteExceptionsScope) {
    let query = supabase.from('availability_exceptions').delete({ count: 'exact' })

    if (scope === 'filtered') {
      query = applyExceptionFilters(query)
    } else {
      query = query.not('id', 'is', null)
    }

    const { count, error } = await query

    if (error) throw error

    return count ?? 0
  }

  function confirmDeleteExceptions(event: FormEvent) {
    event.preventDefault()

    if (!deleteExceptionsDialog) return

    void (async () => {
      setBusyKey('delete-exceptions')
      setMessage(null)

      try {
        await assertActiveAdmin()
        const deletedCount = await deleteAvailabilityExceptions(deleteExceptionsDialog.scope)

        if (deleteExceptionsDialog.count > 0 && deletedCount === 0) {
          throw new Error(t('adminAvailability.error.deleteBlocks'))
        }

        setDeleteExceptionsDialog(null)
        setDeleteAcknowledged(false)
        setDeleteConfirmationInput('')
        setMessage({ tone: 'success', text: t('adminAvailability.message.blocksDeleted') })
        await loadData({ clearMessage: false })
      } catch (error) {
        setMessage({
          tone: 'error',
          text: isAdminPermissionError(error) ? t('adminAvailability.error.deleteBlocks') : getErrorMessage(error),
        })
      } finally {
        setBusyKey(null)
      }
    })()
  }

  function updateBookingStatus(bookingId: string, status: BookingStatus) {
    void runAction(
      `booking-${bookingId}`,
      async () => {
        const result = await supabase
          .from('bookings')
          .update({ status })
          .eq('id', bookingId)
          .select('id, status')
          .maybeSingle()

        if (result.error) throw result.error
        if (!result.data) throw new Error(t('adminAvailability.error.updateNotApplied'))
      },
      t('adminAvailability.message.bookingStatusUpdated'),
    )
  }

  function openBookingCancelDialog(booking: Booking) {
    if (booking.status === 'cancelled') return
    setBookingCancelDialog({ booking })
  }

  function openBookingPermanentDeleteDialog(booking: Booking) {
    if (!isOwner || booking.status !== 'cancelled') return
    setBookingPermanentDeleteDialog({ booking })
  }

  function confirmCancelBooking(event: FormEvent) {
    event.preventDefault()
    const booking = bookingCancelDialog?.booking

    if (!booking) return

    void runAction(
      `cancel-booking-${booking.id}`,
      async () => {
        await assertActiveAdmin()

        const result = await supabase
          .from('bookings')
          .update({ status: 'cancelled' satisfies BookingStatus })
          .eq('id', booking.id)
          .neq('status', 'cancelled')
          .select('id, status')
          .maybeSingle()

        if (result.error) throw result.error
        if (!result.data) throw new Error(t('adminAvailability.error.bookingCancelFailed'))
        setBookingCancelDialog(null)
      },
      t('adminAvailability.message.bookingCancelled'),
    )
  }

  function confirmDeleteBookingPermanently(event: FormEvent) {
    event.preventDefault()
    const booking = bookingPermanentDeleteDialog?.booking

    if (!booking) return

    void (async () => {
      setBusyKey(`delete-booking-${booking.id}`)
      setMessage(null)

      try {
        await assertActiveAdmin()

        if (!isOwner) throw new Error(t('adminAvailability.error.adminPermission'))

        const result = await supabase.rpc('delete_booking_permanently_if_owner', {
          p_booking_id: booking.id,
        })

        if (result.error) throw result.error

        setBookingPermanentDeleteDialog(null)
        setMessage({ tone: 'success', text: t('adminAvailability.message.bookingDeletedPermanently') })
        await loadData({ clearMessage: false })
      } catch {
        setMessage({ tone: 'error', text: t('adminAvailability.error.bookingPermanentDeleteFailed') })
      } finally {
        setBusyKey(null)
      }
    })()
  }

  function openFileUpload(booking: Booking) {
    if (!booking.client_id) {
      setMessage({ tone: 'error', text: t('adminAvailability.files.noRegisteredClient') })
      return
    }

    setFileUploadBooking(booking)
    setFileUploadForm({
      ...emptyFileUploadForm,
      title: booking.service_name,
    })
  }

  function closeFileUpload() {
    if (busyKey === 'file-upload') return
    setFileUploadBooking(null)
    setFileUploadForm(emptyFileUploadForm)
  }

  function uploadBookingFile(event: FormEvent) {
    event.preventDefault()

    if (!fileUploadBooking?.client_id) {
      setMessage({ tone: 'error', text: t('adminAvailability.files.noRegisteredClient') })
      return
    }

    if (!fileUploadForm.file) {
      setMessage({ tone: 'error', text: t('adminAvailability.files.fileRequired') })
      return
    }

    const fileToUpload = fileUploadForm.file

    void runAction(
      'file-upload',
      async () => {
        await assertActiveAdmin()

        const profileResult = await supabase
          .from('profiles')
          .select('id')
          .eq('id', fileUploadBooking.client_id)
          .maybeSingle()

        if (profileResult.error) throw profileResult.error
        if (!profileResult.data) throw new Error(t('adminAvailability.files.noRegisteredClient'))

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) throw sessionError

        const safeFileName = sanitizeFileName(fileToUpload.name) || 'entrega'
        const storagePath = `${fileUploadBooking.client_id}/${fileUploadBooking.id}/${Date.now()}-${safeFileName}`
        const uploadResult = await supabase.storage.from(clientFilesBucket).upload(storagePath, fileToUpload, {
          contentType: fileToUpload.type || 'application/octet-stream',
          upsert: false,
        })

        if (uploadResult.error) throw uploadResult.error

        const metadataResult = await supabase.from('files').insert({
          booking_id: fileUploadBooking.id,
          bucket: clientFilesBucket,
          client_id: fileUploadBooking.client_id,
          description: fileUploadForm.description.trim() || null,
          file_name: fileToUpload.name,
          file_type: fileUploadForm.fileType,
          mime_type: fileToUpload.type || null,
          owner_id: fileUploadBooking.client_id,
          project_name: fileUploadForm.title.trim() || fileUploadBooking.service_name,
          size_bytes: fileToUpload.size,
          storage_path: storagePath,
          team_member_id: fileUploadBooking.producer_id,
          title: fileUploadForm.title.trim() || fileToUpload.name,
          uploaded_by: session?.user.id ?? null,
        })

        if (metadataResult.error) throw metadataResult.error

        setFileUploadBooking(null)
        setFileUploadForm(emptyFileUploadForm)
      },
      t('adminAvailability.message.fileUploaded'),
    )
  }

  function getExceptionDateRangeLabel(group: ExceptionGroup) {
    if (group.isIndefinite) {
      return t('adminAvailability.dateRange.indefinite').replace('{date}', group.dateFrom)
    }

    if (!group.dateTo || group.dateTo === group.dateFrom) return group.dateFrom

    return t('adminAvailability.dateRange.finite')
      .replace('{from}', group.dateFrom)
      .replace('{to}', group.dateTo)
  }

  return (
    <section className="min-h-[calc(100vh-5rem)] w-full max-w-full overflow-x-hidden bg-white py-16 text-zinc-950 sm:py-20 dark:bg-onda-night dark:text-onda-soft">
      <div className="onda-container min-w-0 max-w-full">
        <div className="grid gap-6">
          <SectionTitle
            eyebrow={t('admin.eyebrow')}
            title={t('adminAvailability.title')}
            subtitle={t('adminAvailability.subtitle')}
          />

          <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-onda-purple/20 bg-white/70 p-3 shadow-[0_0_28px_rgba(123,44,255,0.12)] sm:flex-row sm:flex-wrap sm:items-center dark:border-onda-purple/22 dark:bg-onda-black/58 dark:shadow-[0_0_28px_rgba(123,44,255,0.16)]">
            <CTAButton
              to="/admin/eventos"
              variant="secondary"
              className="w-full justify-center sm:w-auto sm:min-w-44"
              icon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
            >
              {t('adminAvailability.events')}
            </CTAButton>
            <CTAButton
              type="button"
              variant="secondary"
              className="w-full justify-center sm:w-auto sm:min-w-44"
              icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
              onClick={() => void loadData()}
            >
              {t('common.refresh')}
            </CTAButton>
            <AdminSignOutButton className="w-full justify-center sm:ml-auto sm:w-auto sm:min-w-48" />
          </div>
        </div>

        <div className="mt-8 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon

            return (
              <div key={stat.label} className="glass-panel min-w-0 rounded-lg bg-white/70 p-4 dark:bg-onda-black/62">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-display text-2xl font-extrabold text-zinc-950 dark:text-white">{stat.value}</div>
                    <div className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-onda-lavender">
                      {stat.label}
                    </div>
                  </div>
                  <Icon className="h-5 w-5 text-onda-lavender" aria-hidden="true" />
                </div>
              </div>
            )
          })}
        </div>

        {message ? (
          <p
            className={cn(
              'mt-6 rounded-md border px-4 py-3 text-sm font-semibold',
              message.tone === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-100'
                : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-100',
            )}
          >
            {message.text}
          </p>
        ) : null}

        {isLoading ? (
          <div className="glass-panel mt-8 flex min-h-56 items-center justify-center rounded-lg bg-white/70 p-8 text-sm font-semibold text-onda-muted dark:bg-onda-black/58">
            <Loader2 className="mr-3 h-5 w-5 animate-spin text-onda-lavender" aria-hidden="true" />
            {t('adminAvailability.loading')}
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
              <div className={panelClassName}>
                <h2 className={panelTitleClassName}>{t('adminAvailability.services.title')}</h2>
                <form onSubmit={saveService} className="mt-5 grid min-w-0 gap-4 md:grid-cols-2">
                  <label className={labelClassName}>
                    {t('common.name')}
                    <input
                      value={serviceForm.name}
                      onChange={(event) => setServiceForm((current) => ({ ...current, name: event.target.value }))}
                      className={inputClassName}
                      required
                    />
                  </label>
                  <label className={labelClassName}>
                    {t('adminAvailability.durationMinutes')}
                    <input
                      type="number"
                      min={15}
                      max={480}
                      step={15}
                      value={serviceForm.durationMinutes}
                      onChange={(event) =>
                        setServiceForm((current) => ({ ...current, durationMinutes: event.target.value }))
                      }
                      className={inputClassName}
                      required
                    />
                  </label>
                  <label className={`${labelClassName} md:col-span-2`}>
                    {t('common.description')}
                    <textarea
                      value={serviceForm.description}
                      onChange={(event) =>
                        setServiceForm((current) => ({ ...current, description: event.target.value }))
                      }
                      className={`${inputClassName} min-h-24 resize-y`}
                    />
                  </label>
                  <label className={labelClassName}>
                    {t('adminAvailability.pricePerSlot')}
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={serviceForm.pricePerSlot}
                      onChange={(event) =>
                        setServiceForm((current) => ({ ...current, pricePerSlot: event.target.value }))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <label className={labelClassName}>
                    {t('adminAvailability.currency')}
                    <input
                      value={serviceForm.currency}
                      onChange={(event) => setServiceForm((current) => ({ ...current, currency: event.target.value }))}
                      className={inputClassName}
                    />
                  </label>
                  <label className={labelClassName}>
                    {t('adminAvailability.depositPercent')}
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={serviceForm.depositPercent}
                      onChange={(event) =>
                        setServiceForm((current) => ({ ...current, depositPercent: event.target.value }))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <div className="grid gap-2 text-sm font-semibold text-zinc-700 sm:grid-cols-3 md:col-span-2 dark:text-onda-soft">
                    <label className={checkboxLabelClassName}>
                      <input
                        type="checkbox"
                        checked={serviceForm.requiresStudio}
                        onChange={(event) =>
                          setServiceForm((current) => ({ ...current, requiresStudio: event.target.checked }))
                        }
                      />
                      {t('adminAvailability.requiresStudio')}
                    </label>
                    <label className={checkboxLabelClassName}>
                      <input
                        type="checkbox"
                        checked={serviceForm.requiresProducer}
                        onChange={(event) =>
                          setServiceForm((current) => ({ ...current, requiresProducer: event.target.checked }))
                        }
                      />
                      {t('adminAvailability.requiresProducer')}
                    </label>
                    <label className={checkboxLabelClassName}>
                      <input
                        type="checkbox"
                        checked={serviceForm.isActive}
                        onChange={(event) =>
                          setServiceForm((current) => ({ ...current, isActive: event.target.checked }))
                        }
                      />
                      {t('common.active')}
                    </label>
                  </div>
                  {serviceForm.requiresStudio ? (
                    <MultiCheckList
                      label={t('adminAvailability.availableStudios')}
                      options={studioAssignmentOptions}
                      selectedValues={serviceForm.studioIds}
                      onChange={(studioIds) => setServiceForm((current) => ({ ...current, studioIds }))}
                      emptyText={t('adminAvailability.noActiveOptions')}
                      className="md:col-span-2"
                    />
                  ) : null}
                  <div className="flex flex-col gap-2 sm:flex-row md:col-span-2">
                    <button
                      type="submit"
                      disabled={busyKey === 'service'}
                      className={primaryButtonClassName}
                    >
                      <Save className="h-4 w-4" aria-hidden="true" />
                      {serviceForm.id ? t('adminAvailability.services.save') : t('adminAvailability.services.create')}
                    </button>
                    {serviceForm.id ? (
                      <button
                        type="button"
                        onClick={() => setServiceForm(emptyServiceForm)}
                        className="inline-flex min-h-11 items-center justify-center rounded-md border border-onda-purple/25 px-4 py-3 font-display text-xs font-bold uppercase tracking-[0.12em] text-onda-purple transition hover:bg-onda-purple/10 dark:border-onda-lavender/25 dark:text-onda-lavender"
                      >
                        {t('adminAvailability.cancelEdit')}
                      </button>
                    ) : null}
                  </div>
                </form>

                <div className="mt-5 grid gap-2">
                  {services.map((service) => (
                    <article key={service.id} className={listItemClassName}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="font-display text-sm font-bold uppercase tracking-[0.1em] text-zinc-950 dark:text-white">
                            {service.name}
                          </h3>
                          <p className="mt-1 text-xs leading-5 text-onda-muted">
                            {service.duration_minutes} {t('common.minutesShort')} -{' '}
                            {service.requires_studio ? t('adminAvailability.withStudio') : t('adminAvailability.withoutStudio')} -{' '}
                            {service.requires_producer ? t('adminAvailability.withProducer') : t('adminAvailability.withoutProducer')}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-onda-muted">
                            {t('adminAvailability.pricePerSlot')}: {formatMoney(service.price_per_slot, service.currency, language === 'en' ? 'en-US' : 'es-CL')} -{' '}
                            {t('adminAvailability.depositPercent')}: {service.deposit_percent}%
                          </p>
                          {service.requires_studio ? (
                            <p className="mt-1 text-xs leading-5 text-onda-muted">
                              {t('adminAvailability.availableStudios')}: {getNamesSummary(studios, service.assigned_studio_ids ?? [], t('adminAvailability.notSet'))}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => editService(service)}
                            className={secondaryButtonClassName}
                          >
                            {t('common.edit')}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleActive('booking_services', service.id, service.is_active)}
                            className={secondaryButtonClassName}
                          >
                            {service.is_active ? t('common.deactivate') : t('common.activate')}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="grid gap-6">
                <div className={panelClassName}>
                  <h2 className={panelTitleClassName}>{t('adminAvailability.studios.title')}</h2>
                  <form onSubmit={saveStudio} className="mt-5 grid min-w-0 gap-4">
                    <label className={labelClassName}>
                      {t('common.name')}
                      <input
                        value={studioForm.name}
                        onChange={(event) => setStudioForm((current) => ({ ...current, name: event.target.value }))}
                        className={inputClassName}
                        required
                      />
                    </label>
                    <label className={labelClassName}>
                      {t('common.description')}
                      <textarea
                        value={studioForm.description}
                        onChange={(event) =>
                          setStudioForm((current) => ({ ...current, description: event.target.value }))
                        }
                        className={`${inputClassName} min-h-20 resize-y`}
                      />
                    </label>
                    <label className={checkboxLabelClassName}>
                      <input
                        type="checkbox"
                        checked={studioForm.isActive}
                        onChange={(event) => setStudioForm((current) => ({ ...current, isActive: event.target.checked }))}
                      />
                      {t('common.active')}
                    </label>
                    <button
                      type="submit"
                      disabled={busyKey === 'studio'}
                      className={primaryButtonClassName}
                    >
                      <Save className="h-4 w-4" aria-hidden="true" />
                      {studioForm.id ? t('adminAvailability.studios.save') : t('adminAvailability.studios.create')}
                    </button>
                  </form>
                  <ResourceList
                    items={studios}
                    onEdit={editStudio}
                    onToggle={(studio) => toggleActive('studios', studio.id, studio.is_active)}
                  />
                </div>

                <div className={panelClassName}>
                  <h2 className={panelTitleClassName}>{t('adminAvailability.producers.title')}</h2>
                  <form onSubmit={saveProducer} className="mt-5 grid min-w-0 gap-4">
                    <label className={labelClassName}>
                      {t('common.name')}
                      <input
                        value={producerForm.name}
                        onChange={(event) => setProducerForm((current) => ({ ...current, name: event.target.value }))}
                        className={inputClassName}
                        required
                      />
                    </label>
                    <label className={labelClassName}>
                      {t('adminAvailability.specialty')}
                      <input
                        value={producerForm.specialty}
                        onChange={(event) =>
                          setProducerForm((current) => ({ ...current, specialty: event.target.value }))
                        }
                        className={inputClassName}
                      />
                    </label>
                    <label className={labelClassName}>
                      {t('adminAvailability.internalRole')}
                      <input
                        value={producerForm.role}
                        onChange={(event) => setProducerForm((current) => ({ ...current, role: event.target.value }))}
                        className={inputClassName}
                      />
                    </label>
                    <label className={labelClassName}>
                      {t('adminAvailability.roleDescription')}
                      <textarea
                        value={producerForm.roleDescription}
                        onChange={(event) =>
                          setProducerForm((current) => ({ ...current, roleDescription: event.target.value }))
                        }
                        className={`${inputClassName} min-h-24 resize-y`}
                      />
                    </label>
                    <label className={labelClassName}>
                      {t('adminAvailability.searchLinkedUser')}
                      <input
                        type="search"
                        value={userSearch}
                        onChange={(event) => setUserSearch(event.target.value)}
                        className={inputClassName}
                        placeholder={t('adminAvailability.searchLinkedUserPlaceholder')}
                      />
                    </label>
                    <OndaSelect
                      label={t('adminAvailability.linkedUser')}
                      value={producerForm.userId}
                      onChange={(userId) => setProducerForm((current) => ({ ...current, userId }))}
                      options={authUserOptions}
                    />
                    {selectedLinkedUserIsDuplicate ? (
                      <p className="rounded-md border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-700 dark:text-amber-100">
                        {t('adminAvailability.error.userAlreadyLinked')}
                      </p>
                    ) : null}
                    {selectedProducerNameLooksDuplicate ? (
                      <p className="rounded-md border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-700 dark:text-amber-100">
                        {t('adminAvailability.error.similarProducerExists')}
                      </p>
                    ) : null}
                    <MultiCheckList
                      label={t('adminAvailability.assignedStudios')}
                      options={studioAssignmentOptions}
                      selectedValues={producerForm.studioIds}
                      onChange={(studioIds) => setProducerForm((current) => ({ ...current, studioIds }))}
                      emptyText={t('adminAvailability.noActiveOptions')}
                    />
                    <MultiCheckList
                      label={t('adminAvailability.assignedServices')}
                      options={serviceAssignmentOptions}
                      selectedValues={producerForm.serviceIds}
                      onChange={(serviceIds) => setProducerForm((current) => ({ ...current, serviceIds }))}
                      emptyText={t('adminAvailability.noActiveOptions')}
                    />
                    <label className={checkboxLabelClassName}>
                      <input
                        type="checkbox"
                        checked={producerForm.isActive}
                        onChange={(event) =>
                          setProducerForm((current) => ({ ...current, isActive: event.target.checked }))
                        }
                      />
                      {t('common.active')}
                    </label>
                    <button
                      type="submit"
                      disabled={busyKey === 'producer' || selectedLinkedUserIsDuplicate || selectedProducerNameLooksDuplicate}
                      className={primaryButtonClassName}
                    >
                      <Save className="h-4 w-4" aria-hidden="true" />
                      {producerForm.id ? t('adminAvailability.producers.save') : t('adminAvailability.producers.create')}
                    </button>
                  </form>
                  <TeamMemberList
                    authUsersById={authUsersById}
                    canDelete={isOwner}
                    items={producers}
                    onDelete={openProducerDeleteDialog}
                    onEdit={editProducer}
                    onToggle={(producer) => toggleActive('producers', producer.id, producer.is_active)}
                    services={services}
                    studios={studios}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
              <div className={panelClassName}>
                <h2 className={panelTitleClassName}>{t('adminAvailability.rules.title')}</h2>
                <form onSubmit={saveRule} className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <OndaSelect
                    label={t('dashboard.service')}
                    value={ruleForm.serviceId}
                    required
                    onChange={(serviceId) => setRuleForm((current) => ({ ...current, serviceId }))}
                    options={serviceOptions}
                  />
                  <OndaSelect
                    label={t('adminAvailability.optionalStudio')}
                    value={ruleForm.studioId}
                    onChange={(studioId) => setRuleForm((current) => ({ ...current, studioId }))}
                    options={studioAnyOptions}
                  />
                  <OndaSelect
                    label={t('adminAvailability.optionalProducer')}
                    value={ruleForm.producerId}
                    onChange={(producerId) => setRuleForm((current) => ({ ...current, producerId }))}
                    options={producerAnyOptions}
                  />
                  <fieldset className="grid min-w-0 gap-3 rounded-md border border-onda-purple/15 bg-white/45 p-3 sm:col-span-2 xl:col-span-3 dark:border-onda-lavender/15 dark:bg-white/[0.04]">
                    <legend className="px-1 font-display text-xs font-bold uppercase tracking-[0.12em] text-zinc-600 dark:text-onda-muted">
                      {t('adminAvailability.weeklyDays')}
                    </legend>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setRuleForm((current) => ({ ...current, weekdays: allWeekdayValues }))}
                        className={secondaryButtonClassName}
                      >
                        {t('adminAvailability.allDays')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRuleForm((current) => ({ ...current, weekdays: workdayValues }))}
                        className={secondaryButtonClassName}
                      >
                        {t('adminAvailability.workdays')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRuleForm((current) => ({ ...current, weekdays: weekendValues }))}
                        className={secondaryButtonClassName}
                      >
                        {t('adminAvailability.weekend')}
                      </button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {weekdayOptions.map((weekday) => (
                        <label key={weekday.value} className={checkboxLabelClassName}>
                          <input
                            type="checkbox"
                            checked={selectedRuleWeekdays.includes(weekday.value)}
                            onChange={(event) =>
                              setRuleForm((current) => ({
                                ...current,
                                weekdays: event.target.checked
                                  ? normalizeWeekdaySelection([...(current.weekdays ?? []), weekday.value])
                                  : normalizeWeekdaySelection((current.weekdays ?? []).filter((value) => value !== weekday.value)),
                              }))
                            }
                          />
                          {weekday.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <label className={labelClassName}>
                    {t('adminAvailability.start')}
                    <input
                      type="time"
                      value={ruleForm.startTime}
                      onChange={(event) => setRuleForm((current) => ({ ...current, startTime: event.target.value }))}
                      className={inputClassName}
                      required
                    />
                  </label>
                  <label className={labelClassName}>
                    {t('adminAvailability.end')}
                    <input
                      type="time"
                      value={ruleForm.endTime}
                      onChange={(event) => setRuleForm((current) => ({ ...current, endTime: event.target.value }))}
                      className={inputClassName}
                      required
                    />
                  </label>
                  <label className={labelClassName}>
                    {t('adminAvailability.slotMinutes')}
                    <input
                      type="number"
                      min={15}
                      max={240}
                      step={15}
                      value={ruleForm.slotMinutes}
                      onChange={(event) => setRuleForm((current) => ({ ...current, slotMinutes: event.target.value }))}
                      className={inputClassName}
                      required
                    />
                  </label>
                  <label className={cn(checkboxLabelClassName, 'self-end')}>
                    <input
                      type="checkbox"
                      checked={ruleForm.isActive}
                      onChange={(event) => setRuleForm((current) => ({ ...current, isActive: event.target.checked }))}
                    />
                    {t('common.active')}
                  </label>
                  <button
                    type="submit"
                    disabled={busyKey === 'rule'}
                    className={cn(primaryButtonClassName, 'self-end xl:w-full')}
                  >
                    <Save className="h-4 w-4" aria-hidden="true" />
                    {ruleForm.id ? t('adminAvailability.rules.save') : t('adminAvailability.rules.create')}
                  </button>
                  {ruleForm.id ? (
                    <button
                      type="button"
                      onClick={() => setRuleForm(emptyRuleForm)}
                      className={cn(secondaryButtonClassName, 'self-end xl:w-full')}
                    >
                      {t('adminAvailability.cancelEdit')}
                    </button>
                  ) : null}
                </form>

                <div className="mt-5 grid gap-2">
                  {ruleGroups.length === 0 ? (
                    <EmptyLine text={t('adminAvailability.rules.empty')} />
                  ) : (
                    ruleGroups.map((group) => (
                      <article key={group.key} className={listItemClassName}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
                              {getNameById(services, group.rule.service_id, t('adminAvailability.generalService'))} -{' '}
                              {getWeekdayGroupLabel(group.weekdays, weekdayOptions, {
                                all: t('adminAvailability.allDays'),
                                weekend: t('adminAvailability.weekend'),
                                workdays: t('adminAvailability.workdays'),
                              })}
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-onda-muted">
                              {normalizeTime(group.rule.start_time)} - {normalizeTime(group.rule.end_time)} - {t('adminAvailability.every')}{' '}
                              {group.rule.slot_minutes} {t('common.minutesShort')} - {getNameById(studios, group.rule.studio_id, t('adminAvailability.anyStudioLower'))} -{' '}
                              {getNameById(producers, group.rule.producer_id, t('adminAvailability.anyProducerLower'))}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-onda-muted">
                              {group.isActive ? t('common.active') : t('common.inactive')}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => editRule(group)} className={secondaryButtonClassName}>
                              {t('common.edit')}
                            </button>
                            <button type="button" onClick={() => toggleRuleGroup(group)} className={secondaryButtonClassName}>
                              {group.isActive ? t('common.deactivate') : t('common.activate')}
                            </button>
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>

              <div className={panelClassName}>
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <h2 className={panelTitleClassName}>{t('adminAvailability.exceptions.title')}</h2>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => void openDeleteExceptionsDialog('filtered')}
                      disabled={busyKey === 'delete-exceptions-filtered-count' || busyKey === 'delete-exceptions'}
                      className={dangerButtonClassName}
                    >
                      {busyKey === 'delete-exceptions-filtered-count' ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                      )}
                      {t('adminAvailability.exceptions.deleteFiltered')}
                    </button>
                    <button
                      type="button"
                      onClick={() => void openDeleteExceptionsDialog('all')}
                      disabled={busyKey === 'delete-exceptions-all-count' || busyKey === 'delete-exceptions'}
                      className={dangerButtonClassName}
                    >
                      {busyKey === 'delete-exceptions-all-count' ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                      )}
                      {t('adminAvailability.exceptions.deleteAll')}
                    </button>
                  </div>
                </div>
                <form onSubmit={saveException} className="mt-5 grid min-w-0 gap-4">
                  <OndaSelect
                    label={t('dashboard.service')}
                    value={exceptionForm.serviceId}
                    required
                    onChange={(serviceId) => setExceptionForm((current) => ({ ...current, serviceId }))}
                    options={serviceOptions}
                  />
                  <div className="grid min-w-0 gap-4 md:grid-cols-2">
                    <OndaSelect
                      label={t('adminAvailability.optionalStudio')}
                      value={exceptionForm.studioId}
                      onChange={(studioId) => setExceptionForm((current) => ({ ...current, studioId }))}
                      options={studioAnyOptions}
                    />
                    <OndaSelect
                      label={t('adminAvailability.optionalProducer')}
                      value={exceptionForm.producerId}
                      onChange={(producerId) => setExceptionForm((current) => ({ ...current, producerId }))}
                      options={producerAnyOptions}
                    />
                  </div>
                  <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <label className={labelClassName}>
                      {t('adminAvailability.dateFrom')}
                      <input
                        type="date"
                        value={exceptionForm.exceptionDate}
                        onChange={(event) =>
                          setExceptionForm((current) => ({
                            ...current,
                            endDate: current.isIndefinite ? '' : current.endDate || event.target.value,
                            exceptionDate: event.target.value,
                          }))
                        }
                        className={inputClassName}
                        required
                      />
                    </label>
                    <label className={labelClassName}>
                      {t('adminAvailability.dateTo')}
                      <input
                        type="date"
                        min={exceptionForm.exceptionDate || undefined}
                        value={exceptionForm.isIndefinite ? '' : exceptionForm.endDate}
                        onChange={(event) =>
                          setExceptionForm((current) => ({ ...current, endDate: event.target.value }))
                        }
                        className={inputClassName}
                        disabled={exceptionForm.isIndefinite}
                      />
                    </label>
                    <label className={labelClassName}>
                      {t('adminAvailability.optionalStart')}
                      <input
                        type="time"
                        value={exceptionForm.startTime}
                        onChange={(event) =>
                          setExceptionForm((current) => ({ ...current, startTime: event.target.value }))
                        }
                        className={inputClassName}
                      />
                    </label>
                    <label className={labelClassName}>
                      {t('adminAvailability.optionalEnd')}
                      <input
                        type="time"
                        value={exceptionForm.endTime}
                        onChange={(event) =>
                          setExceptionForm((current) => ({ ...current, endTime: event.target.value }))
                        }
                        className={inputClassName}
                      />
                    </label>
                  </div>
                  <label className={checkboxLabelClassName}>
                    <input
                      type="checkbox"
                      checked={exceptionForm.isIndefinite}
                      onChange={(event) =>
                        setExceptionForm((current) => ({
                          ...current,
                          endDate: event.target.checked ? '' : current.endDate || current.exceptionDate,
                          isIndefinite: event.target.checked,
                        }))
                      }
                    />
                    {t('adminAvailability.indefinite')}
                  </label>
                  <fieldset className="grid min-w-0 gap-3 rounded-md border border-onda-purple/15 bg-white/45 p-3 dark:border-onda-lavender/15 dark:bg-white/[0.04]">
                    <legend className="px-1 font-display text-xs font-bold uppercase tracking-[0.12em] text-zinc-600 dark:text-onda-muted">
                      {t('adminAvailability.weekdaysInRange')}
                    </legend>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          setExceptionForm((current) => ({ ...current, weekdays: allWeekdayValues }))
                        }
                        className={secondaryButtonClassName}
                      >
                        {t('adminAvailability.allDays')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setExceptionForm((current) => ({ ...current, weekdays: workdayValues }))}
                        className={secondaryButtonClassName}
                      >
                        {t('adminAvailability.workdays')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setExceptionForm((current) => ({ ...current, weekdays: weekendValues }))}
                        className={secondaryButtonClassName}
                      >
                        {t('adminAvailability.weekend')}
                      </button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {weekdayOptions.map((weekday) => (
                        <label key={weekday.value} className={checkboxLabelClassName}>
                          <input
                            type="checkbox"
                            checked={selectedExceptionWeekdays.includes(weekday.value)}
                            onChange={(event) =>
                              setExceptionForm((current) => ({
                                ...current,
                                weekdays: event.target.checked
                                  ? normalizeWeekdaySelection([...(current.weekdays ?? []), weekday.value])
                                  : normalizeWeekdaySelection((current.weekdays ?? []).filter((value) => value !== weekday.value)),
                              }))
                            }
                          />
                          {weekday.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <OndaSelect
                    label={t('adminAvailability.type')}
                    value={exceptionForm.type}
                    onChange={(type) =>
                      setExceptionForm((current) => ({ ...current, type: type as AvailabilityExceptionType }))
                    }
                    options={exceptionTypeOptions}
                  />
                  <label className={labelClassName}>
                    {t('adminAvailability.reason')}
                    <input
                      value={exceptionForm.reason}
                      onChange={(event) => setExceptionForm((current) => ({ ...current, reason: event.target.value }))}
                      className={inputClassName}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={busyKey === 'exception'}
                    className={primaryButtonClassName}
                  >
                    <CalendarClock className="h-4 w-4" aria-hidden="true" />
                    {exceptionForm.id
                      ? t('adminAvailability.exceptions.save')
                      : exceptionForm.type === 'available'
                        ? t('adminAvailability.exceptions.createOpening')
                        : t('adminAvailability.exceptions.createBlock')}
                  </button>
                  {exceptionForm.id ? (
                    <button
                      type="button"
                      onClick={() => setExceptionForm(emptyExceptionForm)}
                      className={secondaryButtonClassName}
                    >
                      {t('adminAvailability.cancelEdit')}
                    </button>
                  ) : null}
                </form>

                <div className="mt-5 grid gap-2">
                  {exceptionGroups.length === 0 ? (
                    <EmptyLine text={t('adminAvailability.exceptions.empty')} />
                  ) : (
                    exceptionGroups.map((group) => (
                      <article key={group.key} className={listItemClassName}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
                              {group.exception.type === 'blocked' ? t('adminAvailability.exception.blocked') : t('adminAvailability.exception.available')} -{' '}
                              {getWeekdayGroupLabel(group.weekdays, weekdayOptions, {
                                all: t('adminAvailability.allDays'),
                                weekend: t('adminAvailability.weekend'),
                                workdays: t('adminAvailability.workdays'),
                              })}
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-onda-muted">
                              {getExceptionDateRangeLabel(group)}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-onda-muted">
                              {getNameById(services, group.exception.service_id, t('adminAvailability.generalService'))} -{' '}
                              {group.exception.start_time ? normalizeTime(group.exception.start_time) : t('adminAvailability.fullDay')}
                              {group.exception.end_time ? ` - ${normalizeTime(group.exception.end_time)}` : ''} -{' '}
                              {getNameById(studios, group.exception.studio_id, t('adminAvailability.anyStudioLower'))} -{' '}
                              {getNameById(producers, group.exception.producer_id, t('adminAvailability.anyProducerLower'))}
                            </p>
                            {group.exception.reason ? (
                              <p className="mt-1 text-xs font-semibold text-zinc-700 dark:text-onda-soft">
                                {t('adminAvailability.reason')}: {group.exception.reason}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => editException(group)} className={secondaryButtonClassName}>
                              {t('common.edit')}
                            </button>
                            <button type="button" onClick={() => deleteException(group)} className={dangerButtonClassName}>
                              {t('common.delete')}
                            </button>
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </div>

            {isOwner ? (
              <div className={`${panelClassName} mt-6`}>
                <h2 className={panelTitleClassName}>{t('adminAvailability.discounts.title')}</h2>
                <form onSubmit={saveDiscountCode} className="mt-5 grid min-w-0 gap-4 md:grid-cols-2">
                  <label className={labelClassName}>
                    {t('adminAvailability.discounts.code')}
                    <input
                      value={discountForm.code}
                      onChange={(event) => setDiscountForm((current) => ({ ...current, code: event.target.value }))}
                      className={inputClassName}
                      required
                    />
                  </label>
                  <OndaSelect
                    label={t('adminAvailability.discounts.type')}
                    value={discountForm.discountType}
                    onChange={(discountType) => setDiscountForm((current) => ({ ...current, discountType }))}
                    options={discountTypeOptions}
                  />
                  <label className={labelClassName}>
                    {t('adminAvailability.discounts.value')}
                    <input
                      type="number"
                      min={0}
                      max={discountForm.discountType === 'percent' ? 100 : undefined}
                      step={discountForm.discountType === 'percent' ? 1 : 100}
                      value={discountForm.discountValue}
                      onChange={(event) => setDiscountForm((current) => ({ ...current, discountValue: event.target.value }))}
                      className={inputClassName}
                      required
                    />
                  </label>
                  <label className={labelClassName}>
                    {t('adminAvailability.discounts.maxUses')}
                    <input
                      type="number"
                      min={0}
                      value={discountForm.maxUses}
                      onChange={(event) => setDiscountForm((current) => ({ ...current, maxUses: event.target.value }))}
                      className={inputClassName}
                    />
                  </label>
                  <label className={labelClassName}>
                    {t('adminAvailability.discounts.validFrom')}
                    <input
                      type="datetime-local"
                      value={discountForm.validFrom}
                      onChange={(event) => setDiscountForm((current) => ({ ...current, validFrom: event.target.value }))}
                      className={inputClassName}
                    />
                  </label>
                  <label className={labelClassName}>
                    {t('adminAvailability.discounts.validUntil')}
                    <input
                      type="datetime-local"
                      value={discountForm.validUntil}
                      onChange={(event) => setDiscountForm((current) => ({ ...current, validUntil: event.target.value }))}
                      className={inputClassName}
                    />
                  </label>
                  <label className={`${labelClassName} md:col-span-2`}>
                    {t('common.description')}
                    <textarea
                      value={discountForm.description}
                      onChange={(event) => setDiscountForm((current) => ({ ...current, description: event.target.value }))}
                      className={`${inputClassName} min-h-20 resize-y`}
                    />
                  </label>
                  <label className={checkboxLabelClassName}>
                    <input
                      type="checkbox"
                      checked={discountForm.isActive}
                      onChange={(event) => setDiscountForm((current) => ({ ...current, isActive: event.target.checked }))}
                    />
                    {t('common.active')}
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row md:col-span-2">
                    <button
                      type="submit"
                      disabled={busyKey === 'discount-code'}
                      className={primaryButtonClassName}
                    >
                      <Save className="h-4 w-4" aria-hidden="true" />
                      {discountForm.id ? t('adminAvailability.discounts.save') : t('adminAvailability.discounts.create')}
                    </button>
                    {discountForm.id ? (
                      <button
                        type="button"
                        onClick={() => setDiscountForm(emptyDiscountForm)}
                        className={secondaryButtonClassName}
                      >
                        {t('adminAvailability.cancelEdit')}
                      </button>
                    ) : null}
                  </div>
                </form>

                <div className="mt-5 grid gap-2">
                  {discountCodes.length === 0 ? (
                    <EmptyLine text={t('adminAvailability.discounts.empty')} />
                  ) : (
                    discountCodes.map((discountCode) => (
                      <article key={discountCode.id} className={listItemClassName}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <h3 className="font-display text-sm font-bold uppercase tracking-[0.1em] text-zinc-950 dark:text-white">
                              {discountCode.code}
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-onda-muted">
                              {discountCode.discount_type === 'percent'
                                ? `${discountCode.discount_value}%`
                                : formatMoney(discountCode.discount_value, 'CLP', language === 'en' ? 'en-US' : 'es-CL')}{' '}
                              - {t('adminAvailability.discounts.depositOnly')}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-onda-muted">
                              {t('adminAvailability.discounts.uses')}: {discountCode.used_count}
                              {discountCode.max_uses !== null ? ` / ${discountCode.max_uses}` : ''}
                            </p>
                            {discountCode.description ? (
                              <p className="mt-1 text-xs leading-5 text-onda-muted">{discountCode.description}</p>
                            ) : null}
                            <p className="mt-1 text-xs font-semibold text-zinc-700 dark:text-onda-soft">
                              {discountCode.is_active ? t('common.active') : t('common.inactive')}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2">
                            <button type="button" onClick={() => editDiscountCode(discountCode)} className={secondaryButtonClassName}>
                              {t('common.edit')}
                            </button>
                            <button type="button" onClick={() => toggleDiscountCode(discountCode)} className={secondaryButtonClassName}>
                              {discountCode.is_active ? t('common.deactivate') : t('common.activate')}
                            </button>
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            ) : null}

            <div className={`${panelClassName} mt-6`}>
              <h2 className={panelTitleClassName}>{t('adminAvailability.bookings.title')}</h2>
              <div className="mt-5 overflow-x-auto rounded-lg border border-onda-purple/12 dark:border-white/10">
                {bookings.length === 0 ? (
                  <EmptyLine text={t('adminAvailability.bookings.empty')} />
                ) : (
                  <table className="min-w-full divide-y divide-onda-purple/10 text-left text-sm dark:divide-white/10">
                    <thead className="bg-onda-purple/15 text-xs uppercase tracking-[0.12em] text-onda-lavender">
                      <tr>
                        <th className="px-4 py-3">{t('dashboard.service')}</th>
                        <th className="px-4 py-3">{t('adminAvailability.resource')}</th>
                        <th className="px-4 py-3">{t('dashboard.date')}</th>
                        <th className="px-4 py-3">{t('adminAvailability.client')}</th>
                        <th className="px-4 py-3">{t('adminAvailability.status')}</th>
                        <th className="px-4 py-3">{t('adminAvailability.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-onda-purple/10 bg-white/50 dark:divide-white/10 dark:bg-white/[0.03]">
                      {bookings.map((booking) => {
                        const canCancelBooking = booking.status === 'pending' || booking.status === 'confirmed'
                        const canDeleteBookingPermanently = booking.status === 'cancelled' && isOwner
                        const isCancellingBooking = busyKey === `cancel-booking-${booking.id}`
                        const isDeletingBooking = busyKey === `delete-booking-${booking.id}`

                        return (
                        <tr key={booking.id}>
                          <td className="px-4 py-4 font-semibold text-zinc-950 dark:text-white">
                            {booking.service_name}
                            {booking.total_amount !== null ? (
                              <p className="mt-1 text-xs font-semibold text-onda-muted">
                                {t('adminAvailability.total')}: {formatMoney(booking.total_amount, booking.currency ?? 'CLP', language === 'en' ? 'en-US' : 'es-CL')}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-4 text-onda-muted">
                            {booking.studio_name ?? t('adminAvailability.noStudio')} - {booking.producer_name ?? t('adminAvailability.noProducer')}
                          </td>
                          <td className="px-4 py-4 text-onda-muted">
                            {booking.booking_date} - {normalizeTime(booking.start_time)} - {normalizeTime(booking.end_time)}
                            {booking.deposit_amount !== null ? (
                              <p className="mt-1 text-xs font-semibold">
                                {t('adminAvailability.depositAmount')}: {formatMoney(booking.deposit_amount, booking.currency ?? 'CLP', language === 'en' ? 'en-US' : 'es-CL')}
                              </p>
                            ) : null}
                            {booking.discount_amount ? (
                              <p className="mt-1 text-xs font-semibold">
                                {t('booking.discountAppliedAmount')}: {formatMoney(booking.discount_amount, booking.currency ?? 'CLP', language === 'en' ? 'en-US' : 'es-CL')}
                                {booking.discount_code ? ` (${booking.discount_code})` : ''}
                              </p>
                            ) : null}
                            {booking.deposit_amount_due !== null ? (
                              <p className="mt-1 text-xs font-semibold">
                                {t('booking.depositDue')}: {formatMoney(booking.deposit_amount_due, booking.currency ?? 'CLP', language === 'en' ? 'en-US' : 'es-CL')}
                              </p>
                            ) : null}
                            <span
                              className={cn(
                                'mt-2 inline-flex rounded-md border px-2.5 py-1 text-xs font-bold uppercase tracking-[0.08em]',
                                paymentStatusClassName(booking.payment_status),
                              )}
                            >
                              {t(`dashboard.paymentStatus.${booking.payment_status ?? 'unpaid'}`)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-onda-muted">
                            {booking.client_name ?? t('adminAvailability.registeredClient')}
                          </td>
                          <td className="px-4 py-4 align-middle">
                            <OndaSelect
                              value={bookingStatuses.includes(booking.status) ? booking.status : 'pending'}
                              onChange={(status) => updateBookingStatus(booking.id, status as BookingStatus)}
                              options={bookingStatusOptions}
                              className="min-w-40"
                              buttonClassName={cn(
                                'min-h-10 px-3 py-2 text-xs font-bold uppercase tracking-[0.08em]',
                                statusClassName(booking.status),
                              )}
                            />
                          </td>
                          <td className="px-4 py-4 align-middle">
                            <div className="flex flex-wrap gap-2">
                              {booking.status === 'completed' && booking.client_id ? (
                                <button
                                  type="button"
                                  onClick={() => openFileUpload(booking)}
                                  className={secondaryButtonClassName}
                                >
                                  <FileUp className="mr-2 h-4 w-4" aria-hidden="true" />
                                  {t('adminAvailability.files.upload')}
                                </button>
                              ) : null}
                              {canCancelBooking ? (
                                <button
                                  type="button"
                                  onClick={() => openBookingCancelDialog(booking)}
                                  disabled={isCancellingBooking}
                                  className={dangerButtonClassName}
                                >
                                  {isCancellingBooking ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                                  ) : (
                                    <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                                  )}
                                  {t('adminAvailability.bookings.cancel')}
                                </button>
                              ) : null}
                              {canDeleteBookingPermanently ? (
                                <button
                                  type="button"
                                  onClick={() => openBookingPermanentDeleteDialog(booking)}
                                  disabled={isDeletingBooking}
                                  className={dangerButtonClassName}
                                >
                                  {isDeletingBooking ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                                  ) : (
                                    <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                                  )}
                                  {t('adminAvailability.bookings.deletePermanently')}
                                </button>
                              ) : null}
                              {booking.status === 'cancelled' && !canDeleteBookingPermanently ? (
                                <span className="inline-flex min-h-10 items-center rounded-md border border-onda-purple/15 px-3 py-2 text-xs font-bold uppercase text-onda-muted dark:border-white/10">
                                  {t('adminAvailability.bookings.alreadyCancelled')}
                                </span>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}

        {producerDeleteDialog ? (
          <div
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
            onClick={() => {
              if (busyKey !== `delete-producer-${producerDeleteDialog.producer.id}`) setProducerDeleteDialog(null)
            }}
            role="presentation"
          >
            <form
              onSubmit={confirmDeleteProducer}
              className="max-h-[92vh] w-full max-w-lg overflow-y-auto overflow-x-hidden rounded-lg border border-red-400/25 bg-white p-5 text-zinc-950 shadow-[0_30px_90px_rgba(24,24,27,0.22)] sm:p-6 dark:border-red-300/25 dark:bg-onda-night dark:text-white"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-producer-modal-title"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-red-600 dark:text-red-200">
                    {t('common.delete')}
                  </p>
                  <h2 id="delete-producer-modal-title" className="mt-2 font-display text-xl font-bold uppercase tracking-[0.08em]">
                    {producerDeleteDialog.producer.name}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setProducerDeleteDialog(null)}
                  disabled={busyKey === `delete-producer-${producerDeleteDialog.producer.id}`}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-onda-lavender/25 text-onda-lavender transition hover:bg-onda-purple hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={t('common.close')}
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <div className="mt-5 flex items-start gap-3 rounded-md border border-red-400/25 bg-red-500/10 p-4 text-sm leading-6 text-red-800 dark:text-red-100">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <p>{t('adminAvailability.producers.deleteConfirm')}</p>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setProducerDeleteDialog(null)}
                  disabled={busyKey === `delete-producer-${producerDeleteDialog.producer.id}`}
                  className={secondaryButtonClassName}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={busyKey === `delete-producer-${producerDeleteDialog.producer.id}`}
                  className={cn(dangerButtonClassName, 'bg-red-600 text-white hover:bg-red-700 dark:text-white')}
                >
                  {busyKey === `delete-producer-${producerDeleteDialog.producer.id}` ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  )}
                  {t('adminAvailability.producers.confirmDelete')}
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {bookingCancelDialog ? (
          <div
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
            onClick={() => {
              if (busyKey !== `cancel-booking-${bookingCancelDialog.booking.id}`) setBookingCancelDialog(null)
            }}
            role="presentation"
          >
            <form
              onSubmit={confirmCancelBooking}
              className="max-h-[92vh] w-full max-w-lg overflow-y-auto overflow-x-hidden rounded-lg border border-red-400/25 bg-white p-5 text-zinc-950 shadow-[0_30px_90px_rgba(24,24,27,0.22)] sm:p-6 dark:border-red-300/25 dark:bg-onda-night dark:text-white"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="cancel-booking-modal-title"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-red-600 dark:text-red-200">
                    {t('adminAvailability.bookings.cancel')}
                  </p>
                  <h2 id="cancel-booking-modal-title" className="mt-2 font-display text-xl font-bold uppercase tracking-[0.08em]">
                    {bookingCancelDialog.booking.service_name}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-onda-muted">
                    {bookingCancelDialog.booking.client_name ?? t('adminAvailability.registeredClient')} - {bookingCancelDialog.booking.booking_date} -{' '}
                    {normalizeTime(bookingCancelDialog.booking.start_time)} - {normalizeTime(bookingCancelDialog.booking.end_time)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setBookingCancelDialog(null)}
                  disabled={busyKey === `cancel-booking-${bookingCancelDialog.booking.id}`}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-onda-lavender/25 text-onda-lavender transition hover:bg-onda-purple hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={t('common.close')}
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <div className="mt-5 flex items-start gap-3 rounded-md border border-red-400/25 bg-red-500/10 p-4 text-sm leading-6 text-red-800 dark:text-red-100">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <p>{t('adminAvailability.bookings.cancelConfirm')}</p>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setBookingCancelDialog(null)}
                  disabled={busyKey === `cancel-booking-${bookingCancelDialog.booking.id}`}
                  className={secondaryButtonClassName}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={busyKey === `cancel-booking-${bookingCancelDialog.booking.id}`}
                  className={cn(dangerButtonClassName, 'bg-red-600 text-white hover:bg-red-700 dark:text-white')}
                >
                  {busyKey === `cancel-booking-${bookingCancelDialog.booking.id}` ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  )}
                  {t('adminAvailability.bookings.confirmCancel')}
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {bookingPermanentDeleteDialog ? (
          <div
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
            onClick={() => {
              if (busyKey !== `delete-booking-${bookingPermanentDeleteDialog.booking.id}`) {
                setBookingPermanentDeleteDialog(null)
              }
            }}
            role="presentation"
          >
            <form
              onSubmit={confirmDeleteBookingPermanently}
              className="max-h-[92vh] w-full max-w-lg overflow-y-auto overflow-x-hidden rounded-lg border border-red-400/25 bg-white p-5 text-zinc-950 shadow-[0_30px_90px_rgba(24,24,27,0.22)] sm:p-6 dark:border-red-300/25 dark:bg-onda-night dark:text-white"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-booking-modal-title"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-red-600 dark:text-red-200">
                    {t('adminAvailability.bookings.deletePermanently')}
                  </p>
                  <h2 id="delete-booking-modal-title" className="mt-2 font-display text-xl font-bold uppercase tracking-[0.08em]">
                    {bookingPermanentDeleteDialog.booking.service_name}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-onda-muted">
                    {bookingPermanentDeleteDialog.booking.client_name ?? t('adminAvailability.registeredClient')} -{' '}
                    {bookingPermanentDeleteDialog.booking.booking_date} - {normalizeTime(bookingPermanentDeleteDialog.booking.start_time)} -{' '}
                    {normalizeTime(bookingPermanentDeleteDialog.booking.end_time)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setBookingPermanentDeleteDialog(null)}
                  disabled={busyKey === `delete-booking-${bookingPermanentDeleteDialog.booking.id}`}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-onda-lavender/25 text-onda-lavender transition hover:bg-onda-purple hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={t('common.close')}
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <div className="mt-5 flex items-start gap-3 rounded-md border border-red-400/25 bg-red-500/10 p-4 text-sm leading-6 text-red-800 dark:text-red-100">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <p>{t('adminAvailability.bookings.deletePermanentConfirm')}</p>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setBookingPermanentDeleteDialog(null)}
                  disabled={busyKey === `delete-booking-${bookingPermanentDeleteDialog.booking.id}`}
                  className={secondaryButtonClassName}
                >
                  {t('adminAvailability.bookings.goBack')}
                </button>
                <button
                  type="submit"
                  disabled={busyKey === `delete-booking-${bookingPermanentDeleteDialog.booking.id}`}
                  className={cn(dangerButtonClassName, 'bg-red-600 text-white hover:bg-red-700 dark:text-white')}
                >
                  {busyKey === `delete-booking-${bookingPermanentDeleteDialog.booking.id}` ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  )}
                  {t('adminAvailability.bookings.confirmDeletePermanently')}
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {fileUploadBooking ? (
          <div
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
            onClick={closeFileUpload}
            role="presentation"
          >
            <form
              onSubmit={uploadBookingFile}
              className="max-h-[92vh] w-full max-w-xl overflow-y-auto overflow-x-hidden rounded-lg border border-onda-purple/20 bg-white p-5 text-zinc-950 shadow-[0_30px_90px_rgba(24,24,27,0.22)] sm:p-6 dark:border-onda-lavender/25 dark:bg-onda-night dark:text-white"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="file-upload-modal-title"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-onda-lavender">
                    {t('adminAvailability.files.upload')}
                  </p>
                  <h2 id="file-upload-modal-title" className="mt-2 font-display text-xl font-bold uppercase tracking-[0.08em]">
                    {fileUploadBooking.service_name}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-onda-muted">
                    {fileUploadBooking.client_name ?? t('adminAvailability.registeredClient')} - {fileUploadBooking.booking_date} -{' '}
                    {normalizeTime(fileUploadBooking.start_time)} - {normalizeTime(fileUploadBooking.end_time)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeFileUpload}
                  disabled={busyKey === 'file-upload'}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-onda-lavender/25 text-onda-lavender transition hover:bg-onda-purple hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={t('common.close')}
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <div className="mt-5 grid gap-4">
                <label className={labelClassName}>
                  {t('adminAvailability.files.title')}
                  <input
                    value={fileUploadForm.title}
                    onChange={(event) => setFileUploadForm((current) => ({ ...current, title: event.target.value }))}
                    className={inputClassName}
                    required
                  />
                </label>

                <OndaSelect
                  label={t('adminAvailability.files.deliveryType')}
                  value={fileUploadForm.fileType}
                  onChange={(fileType) => setFileUploadForm((current) => ({ ...current, fileType }))}
                  options={deliveryTypeOptions}
                />

                <label className={labelClassName}>
                  {t('common.description')}
                  <textarea
                    value={fileUploadForm.description}
                    onChange={(event) =>
                      setFileUploadForm((current) => ({ ...current, description: event.target.value }))
                    }
                    className={`${inputClassName} min-h-24 resize-y`}
                  />
                </label>

                <label className={labelClassName}>
                  {t('adminAvailability.files.file')}
                  <input
                    type="file"
                    onChange={(event) =>
                      setFileUploadForm((current) => ({ ...current, file: event.target.files?.[0] ?? null }))
                    }
                    className={inputClassName}
                    required
                  />
                </label>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeFileUpload}
                    disabled={busyKey === 'file-upload'}
                    className={secondaryButtonClassName}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={busyKey === 'file-upload'}
                    className={primaryButtonClassName}
                  >
                    {busyKey === 'file-upload' ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Upload className="h-4 w-4" aria-hidden="true" />
                    )}
                    {t('adminAvailability.files.uploadFile')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : null}

        {deleteExceptionsDialog ? (
          <div
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
            onClick={() => {
              if (busyKey !== 'delete-exceptions') setDeleteExceptionsDialog(null)
            }}
            role="presentation"
          >
            <form
              onSubmit={confirmDeleteExceptions}
              className="max-h-[92vh] w-full max-w-lg overflow-y-auto overflow-x-hidden rounded-lg border border-red-400/25 bg-white p-5 text-zinc-950 shadow-[0_30px_90px_rgba(24,24,27,0.22)] sm:p-6 dark:border-red-300/25 dark:bg-onda-night dark:text-white"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-exceptions-modal-title"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-red-600 dark:text-red-200">
                    {t('adminAvailability.exceptions.deleteBlocks')}
                  </p>
                  <h2 id="delete-exceptions-modal-title" className="mt-2 font-display text-xl font-bold uppercase tracking-[0.08em]">
                    {deleteExceptionsDialog.scope === 'all'
                      ? t('adminAvailability.exceptions.deleteAll')
                      : t('adminAvailability.exceptions.deleteFiltered')}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteExceptionsDialog(null)}
                  disabled={busyKey === 'delete-exceptions'}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-onda-lavender/25 text-onda-lavender transition hover:bg-onda-purple hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={t('common.close')}
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <div className="mt-5 flex items-start gap-3 rounded-md border border-red-400/25 bg-red-500/10 p-4 text-sm leading-6 text-red-800 dark:text-red-100">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <p>{t('adminAvailability.exceptions.deleteWarning')}</p>
              </div>

              <div className="mt-4 rounded-md border border-onda-purple/15 bg-white/60 px-4 py-3 text-sm font-semibold text-zinc-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-onda-soft">
                {t('adminAvailability.exceptions.deleteCount').replace('{count}', String(deleteExceptionsDialog.count))}
              </div>

              {deleteExceptionsDialog.scope === 'all' ? (
                <label className={`${labelClassName} mt-5`}>
                  {t('adminAvailability.exceptions.deleteTypeConfirm').replace('{token}', deleteConfirmationToken)}
                  <input
                    value={deleteConfirmationInput}
                    onChange={(event) => setDeleteConfirmationInput(event.target.value)}
                    className={inputClassName}
                    disabled={busyKey === 'delete-exceptions'}
                    autoComplete="off"
                  />
                </label>
              ) : (
                <label className={cn(checkboxLabelClassName, 'mt-5')}>
                  <input
                    type="checkbox"
                    checked={deleteAcknowledged}
                    onChange={(event) => setDeleteAcknowledged(event.target.checked)}
                    disabled={busyKey === 'delete-exceptions'}
                  />
                  {t('adminAvailability.exceptions.deleteAcknowledge')}
                </label>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteExceptionsDialog(null)}
                  disabled={busyKey === 'delete-exceptions'}
                  className={secondaryButtonClassName}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={
                    busyKey === 'delete-exceptions' ||
                    deleteExceptionsDialog.count === 0 ||
                    (deleteExceptionsDialog.scope === 'all'
                      ? deleteConfirmationInput !== deleteConfirmationToken
                      : !deleteAcknowledged)
                  }
                  className={cn(dangerButtonClassName, 'bg-red-600 text-white hover:bg-red-700 dark:text-white')}
                >
                  {busyKey === 'delete-exceptions' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  )}
                  {t('adminAvailability.exceptions.confirmDelete')}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function EmptyLine({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-onda-purple/20 bg-white/45 p-4 text-sm text-zinc-600 dark:border-onda-lavender/20 dark:bg-transparent dark:text-onda-muted">
      {text}
    </div>
  )
}

function MultiCheckList({
  className,
  emptyText,
  label,
  onChange,
  options,
  selectedValues,
}: {
  className?: string
  emptyText: string
  label: string
  onChange: (values: string[]) => void
  options: Array<{ id: string; label: string }>
  selectedValues: string[]
}) {
  const selectedValueSet = new Set(selectedValues)

  function toggleValue(value: string, checked: boolean) {
    if (checked) {
      onChange([...selectedValueSet, value])
      return
    }

    onChange(selectedValues.filter((selectedValue) => selectedValue !== value))
  }

  return (
    <fieldset className={cn('grid min-w-0 gap-3 rounded-md border border-onda-purple/15 bg-white/45 p-3 dark:border-onda-lavender/15 dark:bg-white/[0.04]', className)}>
      <legend className="px-1 font-display text-xs font-bold uppercase tracking-[0.12em] text-zinc-600 dark:text-onda-muted">
        {label}
      </legend>
      {options.length === 0 ? (
        <p className="text-sm font-semibold text-onda-muted">{emptyText}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((option) => (
            <label key={option.id} className={checkboxLabelClassName}>
              <input
                type="checkbox"
                checked={selectedValueSet.has(option.id)}
                onChange={(event) => toggleValue(option.id, event.target.checked)}
              />
              <span className="min-w-0 break-words">{option.label}</span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  )
}

function TeamMemberList({
  authUsersById,
  canDelete,
  items,
  onDelete,
  onEdit,
  onToggle,
  services,
  studios,
}: {
  authUsersById: Map<string, AuthUserOption>
  canDelete: boolean
  items: Producer[]
  onDelete: (item: Producer) => void
  onEdit: (item: Producer) => void
  onToggle: (item: Producer) => void
  services: BookingService[]
  studios: Studio[]
}) {
  const { t } = useI18n()

  return (
    <div className="mt-5 grid gap-2">
      {items.length === 0 ? (
        <EmptyLine text={t('adminAvailability.emptyRecords')} />
      ) : (
        items.map((item) => (
          <article key={item.id} className={listItemClassName}>
            <div className="flex min-w-0 items-start justify-between gap-3">
              <h3 className="min-w-0 font-display text-sm font-bold uppercase tracking-[0.1em] text-zinc-950 dark:text-white">
                {item.name}
              </h3>
              <span
                className={cn(
                  'inline-flex shrink-0 items-center rounded-md border px-2.5 py-1 text-xs font-bold uppercase tracking-[0.08em]',
                  item.is_active
                    ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
                    : 'border-zinc-400/30 bg-zinc-500/10 text-zinc-600 dark:text-zinc-200',
                )}
              >
                {item.is_active ? t('common.active') : t('common.inactive')}
              </span>
            </div>

            <div className="mt-3 grid min-w-0 gap-2 text-sm leading-6 text-onda-muted">
              <p>
                <span className="font-bold text-zinc-700 dark:text-onda-soft">{t('adminAvailability.specialty')}:</span>{' '}
                {item.specialty || t('adminAvailability.notSet')}
              </p>
              <p>
                <span className="font-bold text-zinc-700 dark:text-onda-soft">{t('adminAvailability.internalRole')}:</span>{' '}
                {item.role || t('adminAvailability.notSet')}
              </p>
              {item.role_description ? (
                <p className="max-w-4xl leading-7 text-zinc-700 dark:text-onda-soft">{item.role_description}</p>
              ) : null}
              <p>
                <span className="font-bold text-zinc-700 dark:text-onda-soft">{t('adminAvailability.linkedUser')}:</span>{' '}
                <span className="break-all">
                  {getLinkedUserLabel(item.user_id, authUsersById, t('adminAvailability.noLinkedUser'))}
                </span>
              </p>
              <p>
                <span className="font-bold text-zinc-700 dark:text-onda-soft">{t('adminAvailability.assignedStudios')}:</span>{' '}
                {getNamesSummary(studios, item.assigned_studio_ids ?? [], t('adminAvailability.notSet'))}
              </p>
              <p>
                <span className="font-bold text-zinc-700 dark:text-onda-soft">{t('adminAvailability.assignedServices')}:</span>{' '}
                {getNamesSummary(services, item.assigned_service_ids ?? [], t('adminAvailability.notSet'))}
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-2 border-t border-onda-purple/10 pt-4 sm:flex-row sm:flex-wrap sm:justify-end dark:border-white/10">
              <button type="button" onClick={() => onEdit(item)} className={cn(secondaryButtonClassName, 'w-full sm:w-auto')}>
                  {t('common.edit')}
                </button>
              <button type="button" onClick={() => onToggle(item)} className={cn(secondaryButtonClassName, 'w-full sm:w-auto')}>
                  {item.is_active ? t('common.deactivate') : t('common.activate')}
                </button>
              {canDelete ? (
                <button
                  type="button"
                  onClick={() => onDelete(item)}
                  disabled={Boolean(item.user_id)}
                  title={item.user_id ? t('adminAvailability.producers.deleteLinkedDisabled') : undefined}
                  className={cn(
                    dangerButtonClassName,
                    'w-full gap-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent sm:w-auto',
                  )}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  {t('common.delete')}
                </button>
              ) : null}
            </div>
          </article>
        ))
      )}
    </div>
  )
}

function ResourceList<T extends { id: string; is_active: boolean; name: string }>({
  items,
  onEdit,
  onToggle,
}: {
  items: T[]
  onEdit: (item: T) => void
  onToggle: (item: T) => void
}) {
  const { t } = useI18n()

  return (
    <div className="mt-5 grid gap-2">
      {items.length === 0 ? (
        <EmptyLine text={t('adminAvailability.emptyRecords')} />
      ) : (
        items.map((item) => (
          <article key={item.id} className={listItemClassName}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-sm font-bold uppercase tracking-[0.1em] text-zinc-950 dark:text-white">{item.name}</h3>
                <p className="mt-1 text-xs text-onda-muted">{item.is_active ? t('common.active') : t('common.inactive')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => onEdit(item)} className={secondaryButtonClassName}>
                  {t('common.edit')}
                </button>
                <button type="button" onClick={() => onToggle(item)} className={secondaryButtonClassName}>
                  {item.is_active ? t('common.deactivate') : t('common.activate')}
                </button>
              </div>
            </div>
          </article>
        ))
      )}
    </div>
  )
}
