import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarClock,
  Clock3,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
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
  normalizeTime,
  statusClassName,
} from '../lib/dashboard'
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

type ServiceForm = {
  id: string | null
  description: string
  durationMinutes: string
  isActive: boolean
  name: string
  requiresProducer: boolean
  requiresStudio: boolean
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
  specialty: string
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
}

type BookingProfileRow = {
  id: string
  full_name: string | null
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

const bookingStatuses: BookingStatus[] = ['pending', 'confirmed', 'cancelled', 'completed']

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
  id: null,
  description: '',
  durationMinutes: '60',
  isActive: true,
  name: '',
  requiresProducer: false,
  requiresStudio: true,
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
  specialty: '',
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

function getBookingClientName(row: BookingRow, profilesById: Map<string, string>, fallback: string) {
  const profileName = row.client_id ? profilesById.get(row.client_id)?.trim() : ''

  return profileName || row.name?.trim() || row.email?.trim() || fallback
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
  }))
}

export default function AdminAvailability() {
  const { t } = useI18n()
  const [services, setServices] = useState<BookingService[]>([])
  const [studios, setStudios] = useState<Studio[]>([])
  const [producers, setProducers] = useState<Producer[]>([])
  const [rules, setRules] = useState<AvailabilityRule[]>([])
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<MessageState | null>(null)
  const [serviceForm, setServiceForm] = useState<ServiceForm>(emptyServiceForm)
  const [studioForm, setStudioForm] = useState<StudioForm>(emptyStudioForm)
  const [producerForm, setProducerForm] = useState<ProducerForm>(emptyProducerForm)
  const [ruleForm, setRuleForm] = useState<RuleForm>(emptyRuleForm)
  const [exceptionForm, setExceptionForm] = useState<ExceptionForm>(emptyExceptionForm)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [deleteExceptionsDialog, setDeleteExceptionsDialog] = useState<DeleteExceptionsDialogState | null>(null)
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('')
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false)
  const serviceOptions = useMemo<OndaSelectOption[]>(
    () => [
      { value: '', label: t('adminAvailability.select.service'), disabled: true },
      ...services.map((service) => ({ value: service.id, label: service.name })),
    ],
    [services, t],
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
  const ruleGroups = useMemo(() => buildRuleGroups(rules), [rules])
  const exceptionGroups = useMemo(() => buildExceptionGroups(exceptions), [exceptions])
  const selectedRuleWeekdays = normalizeWeekdaySelection(ruleForm.weekdays ?? [])
  const selectedExceptionWeekdays = normalizeWeekdaySelection(exceptionForm.weekdays ?? [])

  const loadData = useCallback(async ({ clearMessage = true }: { clearMessage?: boolean } = {}) => {
    setIsLoading(true)
    if (clearMessage) setMessage(null)

    try {
      const [servicesResult, studiosResult, producersResult, rulesResult, exceptionsResult, bookingsResult] =
        await Promise.all([
          supabase
            .from('booking_services')
            .select('id, name, description, duration_minutes, requires_studio, requires_producer, is_active')
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
            .select('id, client_id, service_id, studio_id, producer_id, booking_date, start_time, end_time, status, notes, name, email')
            .order('booking_date', { ascending: false })
            .order('start_time', { ascending: true })
            .limit(120),
        ])

      const firstError =
        servicesResult.error ??
        studiosResult.error ??
        producersResult.error ??
        rulesResult.error ??
        exceptionsResult.error ??
        bookingsResult.error

      if (firstError) throw firstError

      const nextServices = (servicesResult.data ?? []) as BookingService[]
      const nextStudios = (studiosResult.data ?? []) as Studio[]
      const nextProducers = (producersResult.data ?? []) as Producer[]
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
      id: service.id,
      description: service.description ?? '',
      durationMinutes: String(service.duration_minutes),
      isActive: service.is_active,
      name: service.name,
      requiresProducer: service.requires_producer,
      requiresStudio: service.requires_studio,
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
    setProducerForm({
      id: producer.id,
      isActive: producer.is_active,
      name: producer.name,
      role: producer.role ?? '',
      roleDescription: producer.role_description ?? '',
      specialty: producer.specialty ?? '',
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

  function saveService(event: FormEvent) {
    event.preventDefault()
    const payload = {
      description: serviceForm.description.trim() || null,
      duration_minutes: Number(serviceForm.durationMinutes),
      is_active: serviceForm.isActive,
      name: serviceForm.name.trim(),
      requires_producer: serviceForm.requiresProducer,
      requires_studio: serviceForm.requiresStudio,
    }

    void runAction(
      'service',
      async () => {
        const result = serviceForm.id
          ? await supabase.from('booking_services').update(payload).eq('id', serviceForm.id)
          : await supabase.from('booking_services').insert(payload)

        if (result.error) throw result.error
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
    const payload = {
      is_active: producerForm.isActive,
      name: producerForm.name.trim(),
      role: producerForm.role.trim() || null,
      role_description: producerForm.roleDescription.trim() || null,
      specialty: producerForm.specialty.trim() || null,
    }

    void runAction(
      'producer',
      async () => {
        const result = producerForm.id
          ? await supabase.from('producers').update(payload).eq('id', producerForm.id)
          : await supabase.from('producers').insert(payload)

        if (result.error) throw result.error
        setProducerForm(emptyProducerForm)
      },
      producerForm.id ? t('adminAvailability.message.producerUpdated') : t('adminAvailability.message.producerCreated'),
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

  function cancelBooking(booking: Booking) {
    if (!window.confirm(t('adminAvailability.bookings.deleteConfirm'))) return

    void runAction(
      `delete-booking-${booking.id}`,
      async () => {
        await assertActiveAdmin()

        const result = await supabase
          .from('bookings')
          .update({ status: 'cancelled' satisfies BookingStatus })
          .eq('id', booking.id)
          .select('id, status')
          .maybeSingle()

        if (result.error) throw result.error
        if (!result.data) throw new Error(t('adminAvailability.error.updateNotApplied'))
      },
      t('adminAvailability.message.bookingCancelled'),
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
                      {t('adminAvailability.linkedUser')}
                      <input
                        value={producerForm.userId || t('adminAvailability.noLinkedUser')}
                        className={cn(inputClassName, 'cursor-not-allowed opacity-80')}
                        readOnly
                      />
                    </label>
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
                      disabled={busyKey === 'producer'}
                      className={primaryButtonClassName}
                    >
                      <Save className="h-4 w-4" aria-hidden="true" />
                      {producerForm.id ? t('adminAvailability.producers.save') : t('adminAvailability.producers.create')}
                    </button>
                  </form>
                  <TeamMemberList
                    items={producers}
                    onEdit={editProducer}
                    onToggle={(producer) => toggleActive('producers', producer.id, producer.is_active)}
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
                      {bookings.map((booking) => (
                        <tr key={booking.id}>
                          <td className="px-4 py-4 font-semibold text-zinc-950 dark:text-white">{booking.service_name}</td>
                          <td className="px-4 py-4 text-onda-muted">
                            {booking.studio_name ?? t('adminAvailability.noStudio')} - {booking.producer_name ?? t('adminAvailability.noProducer')}
                          </td>
                          <td className="px-4 py-4 text-onda-muted">
                            {booking.booking_date} - {normalizeTime(booking.start_time)} - {normalizeTime(booking.end_time)}
                          </td>
                          <td className="px-4 py-4 text-onda-muted">
                            {booking.client_name ?? t('adminAvailability.registeredClient')}
                          </td>
                          <td className="px-4 py-4 align-middle">
                            <OndaSelect
                              value={booking.status}
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
                            <button
                              type="button"
                              onClick={() => cancelBooking(booking)}
                              disabled={booking.status === 'cancelled' || busyKey === `delete-booking-${booking.id}`}
                              className={dangerButtonClassName}
                            >
                              {busyKey === `delete-booking-${booking.id}` ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                              ) : (
                                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                              )}
                              {t('adminAvailability.bookings.delete')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}

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

function TeamMemberList({
  items,
  onEdit,
  onToggle,
}: {
  items: Producer[]
  onEdit: (item: Producer) => void
  onToggle: (item: Producer) => void
}) {
  const { t } = useI18n()

  return (
    <div className="mt-5 grid gap-2">
      {items.length === 0 ? (
        <EmptyLine text={t('adminAvailability.emptyRecords')} />
      ) : (
        items.map((item) => (
          <article key={item.id} className={listItemClassName}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="font-display text-sm font-bold uppercase tracking-[0.1em] text-zinc-950 dark:text-white">
                  {item.name}
                </h3>
                <div className="mt-2 grid gap-1 text-xs leading-5 text-onda-muted">
                  <p>
                    <span className="font-bold text-zinc-700 dark:text-onda-soft">{t('adminAvailability.specialty')}:</span>{' '}
                    {item.specialty || t('adminAvailability.notSet')}
                  </p>
                  <p>
                    <span className="font-bold text-zinc-700 dark:text-onda-soft">{t('adminAvailability.internalRole')}:</span>{' '}
                    {item.role || t('adminAvailability.notSet')}
                  </p>
                  {item.role_description ? (
                    <p className="max-w-prose">{item.role_description}</p>
                  ) : null}
                  <p className="break-all">
                    <span className="font-bold text-zinc-700 dark:text-onda-soft">{t('adminAvailability.linkedUser')}:</span>{' '}
                    {item.user_id || t('adminAvailability.noLinkedUser')}
                  </p>
                  <p>{item.is_active ? t('common.active') : t('common.inactive')}</p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
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
