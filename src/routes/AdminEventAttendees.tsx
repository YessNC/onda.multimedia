import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowLeft,
  ChevronDown,
  Check,
  Clipboard,
  Clock3,
  Ban,
  Download,
  Edit3,
  Eye,
  History,
  ImagePlus,
  Loader2,
  MoreVertical,
  QrCode,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react'
import { useParams } from 'react-router-dom'
import AdminSignOutButton from '../components/admin/AdminSignOutButton'
import ImageUploader from '../components/admin/ImageUploader'
import CTAButton from '../components/shared/CTAButton'
import SectionTitle from '../components/shared/SectionTitle'
import {
  DEFAULT_QR_BOX,
  GENERATED_INVITATIONS_BUCKET,
  INVITATION_TEMPLATE_BUCKET,
  buildAdminCheckInUrl,
  buildAttendeeFullName,
  buildInvitationFileName,
  buildInvitationStoragePath,
  createQrBlob,
  createQrDataUrl,
  downloadBlob,
  getAccessCodePlacement,
  getAccessCodeText,
  normalizeQrBox,
  renderInvitationPng,
  sanitizeFileName,
} from '../lib/invitations'
import type { InvitationQrBox } from '../lib/invitations'
import { createAccessCode, normalizeAccessCode } from '../lib/accessCodes'
import { supabase } from '../lib/supabaseClient'
import { cn } from '../lib/utils'

type AdminEvent = Record<string, unknown> & {
  id: string
  invitation_qr_height?: number | string | null
  invitation_qr_width?: number | string | null
  invitation_qr_x?: number | string | null
  invitation_qr_y?: number | string | null
  invitation_template_bucket?: string | null
  invitation_template_path?: string | null
  name?: string | null
  title?: string | null
}

type EventAttendee = Record<string, unknown> & {
  access_code?: string | null
  accepted_privacy?: boolean | null
  accepted_terms?: boolean | null
  check_in_status?: string | null
  checked_in_at?: string | null
  community_consent?: boolean | null
  community_consent_at?: string | null
  consent_at?: string | null
  email?: string | null
  event_id?: string | null
  first_name?: string | null
  full_name?: string | null
  guest_type?: string | null
  id: string
  instagram_handle?: string | null
  invitation_expires_at?: string | null
  invitation_generated_at?: string | null
  invitation_token?: string | null
  last_name?: string | null
  notes?: string | null
  phone?: string | null
  qr_token?: string | null
  ticket_downloaded_at?: string | null
  ticket_generated_at?: string | null
  ticket_status?: string | null
}

type GeneratedInvitation = Record<string, unknown> & {
  access_code?: string | null
  attendee_id: string
  bucket?: string | null
  delivery_channel?: string | null
  download_count?: number | null
  downloaded_at?: string | null
  file_name?: string | null
  generated_at?: string | null
  generated_by?: string | null
  id: string
  path?: string | null
  qr_token?: string | null
  size_bytes?: number | null
}

type AttendeeFormState = {
  email: string
  firstName: string
  guestType: string
  instagramHandle: string
  lastName: string
  notes: string
  phone: string
}

const emptyAttendeeForm: AttendeeFormState = {
  email: '',
  firstName: '',
  guestType: '',
  instagramHandle: '',
  lastName: '',
  notes: '',
  phone: '',
}

const labelClassName = 'grid gap-2 text-sm font-semibold text-zinc-700 dark:text-onda-soft'
const inputClassName =
  'min-h-12 rounded-md border border-onda-purple/20 bg-white/70 px-4 py-3 text-sm outline-none transition focus:border-onda-purple dark:bg-white/5 dark:text-white'

const actionButtonVariants = {
  danger:
    'border-red-500/45 bg-red-500/10 text-red-700 hover:border-red-500 hover:bg-red-500 hover:text-white dark:text-red-200',
  ghost:
    'border-white/10 bg-white/5 text-zinc-700 hover:border-onda-purple/40 hover:bg-onda-purple/10 dark:text-onda-soft',
  primary:
    'border-onda-purple bg-onda-purple text-white shadow-[0_0_22px_rgba(123,44,255,0.28)] hover:bg-onda-electric',
  secondary:
    'border-onda-purple/35 bg-white/65 text-onda-purple hover:border-onda-purple hover:bg-onda-purple/10 dark:bg-white/5 dark:text-onda-soft',
}

const ACTIONS_MENU_ESTIMATED_HEIGHT = 392
const ACTIONS_MENU_GUTTER = 12
const ACTIONS_MENU_WIDTH = 288

type ActionButtonProps = {
  children: string
  disabled?: boolean
  icon: ReactNode
  onClick: () => void
  variant?: keyof typeof actionButtonVariants
}

function ActionButton({
  children,
  disabled = false,
  icon,
  onClick,
  variant = 'secondary',
}: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-md border px-3.5 py-2.5 font-display text-[0.64rem] font-bold uppercase leading-tight tracking-[0.12em] transition duration-300 disabled:cursor-not-allowed disabled:opacity-50',
        actionButtonVariants[variant],
      )}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}

type ActionsMenuPosition = {
  attendeeId: string
  left: number
  maxHeight: number
  placement: 'bottom' | 'top'
  top: number
  width: number
}

type ActionsMenuItemProps = {
  children: string
  danger?: boolean
  disabled?: boolean
  icon: ReactNode
  onClick: () => void
}

function ActionsMenuItem({
  children,
  danger = false,
  disabled = false,
  icon,
  onClick,
}: ActionsMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex min-h-12 w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45',
        danger
          ? 'text-red-700 hover:bg-red-500/10 dark:text-red-200'
          : 'text-zinc-700 hover:bg-onda-purple/10 dark:text-onda-soft',
      )}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}

function readString(value: unknown) {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return ''
}

function nullableString(value: string) {
  const trimmed = value.trim()
  return trimmed || null
}

function normalizeInstagramHandle(value: string) {
  const handle = value.trim().replace(/^@+/, '')
  return handle ? `@${handle}` : null
}

function createQrToken() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function buildGuestInvitationUrl(invitationToken: string) {
  return `${window.location.origin}/entrada/${encodeURIComponent(invitationToken)}`
}

function getAttendeeAccessCode(attendee: EventAttendee | null | undefined) {
  return normalizeAccessCode(readString(attendee?.access_code))
}

function getInvitationAccessCode(
  invitation: GeneratedInvitation,
  attendee: EventAttendee | null | undefined,
) {
  return normalizeAccessCode(readString(invitation.access_code)) || getAttendeeAccessCode(attendee)
}

function buildInvitationDownloadName(
  invitation: GeneratedInvitation,
  attendee: EventAttendee | null | undefined,
) {
  return buildInvitationFileName({
    accessCode: getInvitationAccessCode(invitation, attendee),
    firstName: attendee?.first_name,
    fullName: attendee ? getAttendeeName(attendee) : invitation.file_name,
    lastName: attendee?.last_name,
    qrToken: invitation.qr_token,
  })
}

async function createUniqueAccessCodeForEvent(eventId: string, reservedCodes = new Set<string>()) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const accessCode = createAccessCode()

    if (reservedCodes.has(accessCode)) continue

    const { data, error } = await supabase
      .from('event_attendees')
      .select('id')
      .eq('event_id', eventId)
      .eq('access_code', accessCode)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      reservedCodes.add(accessCode)
      return accessCode
    }
  }

  throw new Error('No pudimos generar un codigo unico para este evento.')
}

async function ensureAttendeesAccessCodes(eventId: string, attendeeRows: EventAttendee[]) {
  const reservedCodes = new Set(attendeeRows.map(getAttendeeAccessCode).filter(Boolean))
  const nextAttendees: EventAttendee[] = []

  for (const attendee of attendeeRows) {
    const currentCode = getAttendeeAccessCode(attendee)
    const currentInvitationToken = readString(attendee.invitation_token)
    const attendeePatch: Partial<EventAttendee> = {}

    if (currentCode) {
      attendeePatch.access_code = currentCode
    } else {
      attendeePatch.access_code = await createUniqueAccessCodeForEvent(eventId, reservedCodes)
    }

    if (currentInvitationToken) {
      attendeePatch.invitation_token = currentInvitationToken
    } else {
      attendeePatch.invitation_token = createQrToken()
    }

    if (currentCode && currentInvitationToken) {
      nextAttendees.push({ ...attendee, access_code: currentCode, invitation_token: currentInvitationToken })
      continue
    }

    const { data, error } = await supabase.from('event_attendees').update(attendeePatch).eq('id', attendee.id).select('*').single()

    if (error) throw error

    nextAttendees.push(data as EventAttendee)
  }

  return nextAttendees
}

function getEventTitle(eventRecord: AdminEvent | null) {
  if (!eventRecord) return 'Evento'

  return (
    readString(eventRecord.title) ||
    readString(eventRecord.name) ||
    readString(eventRecord.slug) ||
    `Evento ${eventRecord.id}`
  )
}

function getAttendeeName(attendee: EventAttendee) {
  return (
    buildAttendeeFullName(attendee.first_name ?? '', attendee.last_name ?? '') ||
    readString(attendee.full_name) ||
    'Asistente sin nombre'
  )
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Sin fecha'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatFileSize(bytes?: number | null) {
  if (!bytes || bytes < 1) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatUserId(value?: string | null) {
  return value ? value.slice(0, 8) : 'Sin registro'
}

function getCheckInStatusLabel(attendee: EventAttendee) {
  const status = readString(attendee.check_in_status)

  if (status === 'checked_in') return `Validado ${formatDateTime(attendee.checked_in_at)}`
  if (status === 'cancelled') return 'Cancelada'
  return 'Pendiente'
}

function getTicketStatus(attendee: EventAttendee) {
  const checkInStatus = readString(attendee.check_in_status)
  const ticketStatus = readString(attendee.ticket_status)

  if (checkInStatus === 'checked_in' || attendee.checked_in_at) return 'used'
  if (checkInStatus === 'cancelled' || ticketStatus === 'cancelled') return 'cancelled'
  if (ticketStatus === 'used') return hasLegalConsent(attendee) ? 'generated' : 'pending'

  return ticketStatus || 'pending'
}

function getTicketStatusLabel(attendee: EventAttendee) {
  const status = getTicketStatus(attendee)

  if (status === 'generated') return 'Generada'
  if (status === 'used') return `Utilizada ${formatDateTime(attendee.checked_in_at)}`
  if (status === 'cancelled') return 'Cancelada'
  if (status === 'expired') return 'Vencida'
  return 'Pendiente'
}

function getTicketStatusClassName(attendee: EventAttendee) {
  const status = getTicketStatus(attendee)

  if (status === 'generated') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
  }

  if (status === 'used') {
    return 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-200'
  }

  if (status === 'cancelled' || status === 'expired') {
    return 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200'
  }

  return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200'
}

function hasLegalConsent(attendee: EventAttendee) {
  return Boolean(attendee.accepted_privacy && attendee.accepted_terms)
}

function getConsentStatusLabel(attendee: EventAttendee) {
  if (!hasLegalConsent(attendee)) return 'Pendiente'
  return attendee.consent_at ? `Aceptado ${formatDateTime(attendee.consent_at)}` : 'Aceptado'
}

function getConsentStatusClassName(attendee: EventAttendee) {
  if (hasLegalConsent(attendee)) {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
  }

  return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200'
}

function readEventQrBox(eventRecord: AdminEvent | null) {
  return normalizeQrBox({
    height: eventRecord?.invitation_qr_height ?? DEFAULT_QR_BOX.height,
    width: eventRecord?.invitation_qr_width ?? DEFAULT_QR_BOX.width,
    x: eventRecord?.invitation_qr_x ?? DEFAULT_QR_BOX.x,
    y: eventRecord?.invitation_qr_y ?? DEFAULT_QR_BOX.y,
  })
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Ocurrio un error inesperado.'
}

function qrInputValue(value: number) {
  return Number.isFinite(value) ? String(value) : ''
}

export default function AdminEventAttendees() {
  const { eventId } = useParams<{ eventId: string }>()
  const [actionsMenu, setActionsMenu] = useState<ActionsMenuPosition | null>(null)
  const [attendeeForm, setAttendeeForm] = useState<AttendeeFormState>(emptyAttendeeForm)
  const [attendees, setAttendees] = useState<EventAttendee[]>([])
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [editingAttendeeId, setEditingAttendeeId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [eventRecord, setEventRecord] = useState<AdminEvent | null>(null)
  const [historyAttendee, setHistoryAttendee] = useState<EventAttendee | null>(null)
  const [invitations, setInvitations] = useState<GeneratedInvitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingAttendee, setIsSavingAttendee] = useState(false)
  const [isSavingQrBox, setIsSavingQrBox] = useState(false)
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false)
  const [message, setMessage] = useState('')
  const [qrDraft, setQrDraft] = useState<InvitationQrBox>(DEFAULT_QR_BOX)
  const [qrPreviewDataUrl, setQrPreviewDataUrl] = useState('')
  const [showQrPreview, setShowQrPreview] = useState(false)
  const [templateImageSize, setTemplateImageSize] = useState({ height: 0, width: 0 })
  const [templatePreviewUrl, setTemplatePreviewUrl] = useState('')

  const loadAdminData = useCallback(async () => {
    if (!eventId) return

    setIsLoading(true)
    setErrorMessage('')

    try {
      const [eventResponse, attendeesResponse, invitationsResponse] = await Promise.all([
        supabase.from('events').select('*').eq('id', eventId).single(),
        supabase.from('event_attendees').select('*').eq('event_id', eventId),
        supabase
          .from('generated_invitations')
          .select('*')
          .eq('event_id', eventId)
          .order('generated_at', { ascending: false }),
      ])

      if (eventResponse.error) throw eventResponse.error
      if (attendeesResponse.error) throw attendeesResponse.error
      if (invitationsResponse.error) throw invitationsResponse.error

      const nextEvent = eventResponse.data as AdminEvent
      const attendeeRows = (attendeesResponse.data ?? []) as EventAttendee[]
      const nextAttendees = await ensureAttendeesAccessCodes(eventId, attendeeRows)

      setEventRecord(nextEvent)
      setQrDraft(readEventQrBox(nextEvent))
      setAttendees(nextAttendees)
      setInvitations((invitationsResponse.data ?? []) as GeneratedInvitation[])
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    void loadAdminData()
  }, [loadAdminData])

  useEffect(() => {
    if (!actionsMenu) return

    function handlePointerDown(pointerEvent: PointerEvent) {
      const target = pointerEvent.target

      if (!(target instanceof Element)) return
      if (target.closest('[data-attendee-actions-menu]') || target.closest('[data-attendee-actions-trigger]')) return

      setActionsMenu(null)
    }

    function closeActionsMenu() {
      setActionsMenu(null)
    }

    function handleScroll(scrollEvent: Event) {
      const target = scrollEvent.target

      if (target instanceof Element && target.closest('[data-attendee-actions-menu]')) return

      setActionsMenu(null)
    }

    function handleKeyDown(keyboardEvent: KeyboardEvent) {
      if (keyboardEvent.key === 'Escape') {
        setActionsMenu(null)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', closeActionsMenu)
    window.addEventListener('scroll', handleScroll, true)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', closeActionsMenu)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [actionsMenu])

  useEffect(() => {
    const templatePath = eventRecord?.invitation_template_path
    const templateBucket = eventRecord?.invitation_template_bucket || INVITATION_TEMPLATE_BUCKET

    setTemplateImageSize({ height: 0, width: 0 })
    setTemplatePreviewUrl('')

    if (!templatePath) return

    let isMounted = true

    supabase.storage
      .from(templateBucket)
      .createSignedUrl(templatePath, 600)
      .then(({ data, error }) => {
        if (!isMounted) return

        if (error) {
          setErrorMessage(error.message)
          return
        }

        setTemplatePreviewUrl(data.signedUrl)
      })

    return () => {
      isMounted = false
    }
  }, [eventRecord?.invitation_template_bucket, eventRecord?.invitation_template_path])

  const latestInvitationByAttendeeId = useMemo(() => {
    const latestByAttendee = new Map<string, GeneratedInvitation>()

    for (const invitation of invitations) {
      const existing = latestByAttendee.get(invitation.attendee_id)
      const invitationTime = new Date(invitation.generated_at ?? '').getTime() || 0
      const existingTime = new Date(existing?.generated_at ?? '').getTime() || 0

      if (!existing || invitationTime > existingTime) {
        latestByAttendee.set(invitation.attendee_id, invitation)
      }
    }

    return latestByAttendee
  }, [invitations])

  const eventTitle = getEventTitle(eventRecord)
  const previewQrBox = normalizeQrBox(qrDraft)
  const previewAccessCodePlacement = getAccessCodePlacement(templateImageSize.width, templateImageSize.height)
  const canShowQrOverlay =
    showQrPreview && Boolean(qrPreviewDataUrl) && templateImageSize.height > 0 && templateImageSize.width > 0
  const historyItems = historyAttendee
    ? invitations.filter((invitation) => invitation.attendee_id === historyAttendee.id)
    : []

  function isBusy(action: string, id: string) {
    return busyAction === `${action}:${id}`
  }

  function resetMessages() {
    setErrorMessage('')
    setMessage('')
  }

  function toggleActionsMenu(attendeeId: string, trigger: HTMLButtonElement) {
    setActionsMenu((currentMenu) => {
      if (currentMenu?.attendeeId === attendeeId) return null

      const rect = trigger.getBoundingClientRect()
      const menuWidth = Math.min(ACTIONS_MENU_WIDTH, window.innerWidth - ACTIONS_MENU_GUTTER * 2)
      const maxLeft = Math.max(ACTIONS_MENU_GUTTER, window.innerWidth - menuWidth - ACTIONS_MENU_GUTTER)
      const left = Math.min(Math.max(ACTIONS_MENU_GUTTER, rect.right - menuWidth), maxLeft)
      const spaceAbove = Math.max(0, rect.top - ACTIONS_MENU_GUTTER * 2)
      const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - ACTIONS_MENU_GUTTER * 2)
      const shouldOpenUp = spaceBelow < ACTIONS_MENU_ESTIMATED_HEIGHT && spaceAbove > spaceBelow
      const availableHeight = shouldOpenUp ? spaceAbove : spaceBelow

      return {
        attendeeId,
        left,
        maxHeight: Math.max(96, Math.min(ACTIONS_MENU_ESTIMATED_HEIGHT, availableHeight)),
        placement: shouldOpenUp ? 'top' : 'bottom',
        top: shouldOpenUp ? rect.top - ACTIONS_MENU_GUTTER : rect.bottom + ACTIONS_MENU_GUTTER,
        width: menuWidth,
      }
    })
  }

  function runActionsMenuAction(action: () => void) {
    setActionsMenu(null)
    action()
  }

  function resetAttendeeForm() {
    setAttendeeForm(emptyAttendeeForm)
    setEditingAttendeeId(null)
  }

  function handleEventImageUpdated(event: AdminEvent) {
    setEventRecord(event)
    setMessage('Imagen del evento actualizada.')
  }

  function handleQrDraftChange(key: keyof InvitationQrBox, value: string) {
    setQrDraft((current) => ({
      ...current,
      [key]: value.trim() === '' ? Number.NaN : Number(value),
    }))
  }

  async function handleTemplateUpload(uploadEvent: ChangeEvent<HTMLInputElement>) {
    const input = uploadEvent.currentTarget
    const file = input.files?.[0]

    if (!eventId || !file) return

    resetMessages()
    setIsUploadingTemplate(true)

    const safeFileName = sanitizeFileName(file.name) || 'template.png'
    const path = `events/${eventId}/templates/${Date.now()}-${safeFileName}`

    try {
      const { error: uploadError } = await supabase.storage
        .from(INVITATION_TEMPLATE_BUCKET)
        .upload(path, file, {
          contentType: file.type || 'image/png',
          upsert: false,
        })

      if (uploadError) throw uploadError

      const { data, error: updateError } = await supabase
        .from('events')
        .update({
          invitation_template_bucket: INVITATION_TEMPLATE_BUCKET,
          invitation_template_path: path,
        })
        .eq('id', eventId)
        .select('*')
        .single()

      if (updateError) throw updateError

      setEventRecord(data as AdminEvent)
      setMessage('Plantilla de invitacion subida.')
      input.value = ''
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsUploadingTemplate(false)
    }
  }

  async function handleSaveQrBox() {
    if (!eventId) return

    resetMessages()
    setIsSavingQrBox(true)

    const qrBox = normalizeQrBox(qrDraft)

    try {
      const { data, error } = await supabase
        .from('events')
        .update({
          invitation_qr_height: qrBox.height,
          invitation_qr_width: qrBox.width,
          invitation_qr_x: qrBox.x,
          invitation_qr_y: qrBox.y,
        })
        .eq('id', eventId)
        .select('*')
        .single()

      if (error) throw error

      setEventRecord(data as AdminEvent)
      setQrDraft(qrBox)
      setMessage('Posicion QR guardada.')
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSavingQrBox(false)
    }
  }

  async function handleTestQrPosition() {
    resetMessages()

    try {
      const qrBox = normalizeQrBox(qrDraft)
      const dataUrl = await createQrDataUrl(
        buildAdminCheckInUrl('preview-token', eventId),
        Math.max(qrBox.width, qrBox.height) * 2,
      )

      setQrDraft(qrBox)
      setQrPreviewDataUrl(dataUrl)
      setShowQrPreview(true)
      setMessage('Preview QR actualizado.')
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  function handleEditAttendee(attendee: EventAttendee) {
    setEditingAttendeeId(attendee.id)
    setAttendeeForm({
      email: attendee.email ?? '',
      firstName: attendee.first_name ?? '',
      guestType: attendee.guest_type ?? '',
      instagramHandle: attendee.instagram_handle ?? '',
      lastName: attendee.last_name ?? '',
      notes: attendee.notes ?? '',
      phone: attendee.phone ?? '',
    })
  }

  async function handleAttendeeSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()

    if (!eventId) return

    resetMessages()

    const firstName = attendeeForm.firstName.trim()
    const lastName = attendeeForm.lastName.trim()
    const fullName = buildAttendeeFullName(firstName, lastName)

    if (!firstName || !lastName || !fullName) {
      setErrorMessage('Ingresa nombre y apellido del asistente.')
      return
    }

    setIsSavingAttendee(true)

    const attendeePayload = {
      email: nullableString(attendeeForm.email),
      first_name: firstName,
      full_name: fullName,
      guest_type: nullableString(attendeeForm.guestType),
      instagram_handle: normalizeInstagramHandle(attendeeForm.instagramHandle),
      last_name: lastName,
      notes: nullableString(attendeeForm.notes),
      phone: nullableString(attendeeForm.phone),
    }

    try {
      if (editingAttendeeId) {
        const currentAttendee = attendees.find((attendee) => attendee.id === editingAttendeeId)
        const reservedCodes = new Set(attendees.map(getAttendeeAccessCode).filter(Boolean))
        const accessCode =
          getAttendeeAccessCode(currentAttendee) || (await createUniqueAccessCodeForEvent(eventId, reservedCodes))
        const { error } = await supabase
          .from('event_attendees')
          .update({
            ...attendeePayload,
            access_code: accessCode,
            invitation_token: currentAttendee?.invitation_token || createQrToken(),
            qr_token: currentAttendee?.qr_token || createQrToken(),
          })
          .eq('id', editingAttendeeId)

        if (error) throw error
        setMessage('Asistente actualizado.')
      } else {
        const reservedCodes = new Set(attendees.map(getAttendeeAccessCode).filter(Boolean))
        const accessCode = await createUniqueAccessCodeForEvent(eventId, reservedCodes)
        const { error } = await supabase.from('event_attendees').insert({
          ...attendeePayload,
          access_code: accessCode,
          event_id: eventId,
          invitation_token: createQrToken(),
          qr_token: createQrToken(),
        })

        if (error) throw error
        setMessage('Asistente creado.')
      }

      resetAttendeeForm()
      await loadAdminData()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSavingAttendee(false)
    }
  }

  async function ensureAttendeeQrToken(attendee: EventAttendee) {
    if (attendee.qr_token) return attendee.qr_token

    const nextToken = createQrToken()
    const { data, error } = await supabase
      .from('event_attendees')
      .update({ qr_token: nextToken })
      .eq('id', attendee.id)
      .select('*')
      .single()

    if (error) throw error

    setAttendees((currentAttendees) =>
      currentAttendees.map((currentAttendee) =>
        currentAttendee.id === attendee.id ? (data as EventAttendee) : currentAttendee,
      ),
    )

    return nextToken
  }

  async function ensureAttendeeInvitationToken(attendee: EventAttendee) {
    if (attendee.invitation_token) return attendee.invitation_token

    const nextToken = createQrToken()
    const { data, error } = await supabase
      .from('event_attendees')
      .update({ invitation_token: nextToken })
      .eq('id', attendee.id)
      .select('*')
      .single()

    if (error) throw error

    setAttendees((currentAttendees) =>
      currentAttendees.map((currentAttendee) =>
        currentAttendee.id === attendee.id ? (data as EventAttendee) : currentAttendee,
      ),
    )

    return nextToken
  }

  async function ensureAttendeeAccessCode(attendee: EventAttendee) {
    if (!eventId) throw new Error('Falta el ID del evento.')

    const currentCode = getAttendeeAccessCode(attendee)

    if (currentCode) return currentCode

    const reservedCodes = new Set(attendees.map(getAttendeeAccessCode).filter(Boolean))
    const accessCode = await createUniqueAccessCodeForEvent(eventId, reservedCodes)
    const { data, error } = await supabase
      .from('event_attendees')
      .update({ access_code: accessCode })
      .eq('id', attendee.id)
      .select('*')
      .single()

    if (error) throw error

    setAttendees((currentAttendees) =>
      currentAttendees.map((currentAttendee) =>
        currentAttendee.id === attendee.id ? (data as EventAttendee) : currentAttendee,
      ),
    )

    return accessCode
  }

  async function handleGenerateInvitation(attendee: EventAttendee) {
    if (!eventId || !eventRecord) return

    resetMessages()

    const templatePath = eventRecord.invitation_template_path
    const templateBucket = eventRecord.invitation_template_bucket || INVITATION_TEMPLATE_BUCKET

    if (!templatePath) {
      setErrorMessage('Sube una plantilla antes de generar invitaciones.')
      return
    }

    if (getTicketStatus(attendee) === 'used' || getTicketStatus(attendee) === 'cancelled') {
      setErrorMessage('No se puede generar una invitacion para una entrada utilizada o cancelada.')
      return
    }

    setBusyAction(`generate:${attendee.id}`)

    try {
      const [{ data: sessionData }, { data: signedTemplate, error: signedTemplateError }] =
        await Promise.all([
          supabase.auth.getSession(),
          supabase.storage.from(templateBucket).createSignedUrl(templatePath, 60),
        ])

      if (signedTemplateError) throw signedTemplateError

      const qrToken = await ensureAttendeeQrToken(attendee)
      const accessCode = await ensureAttendeeAccessCode(attendee)
      const qrPayload = buildAdminCheckInUrl(qrToken, eventId)
      const qrBox = normalizeQrBox(qrDraft)
      const invitationBlob = await renderInvitationPng({
        accessCode,
        qrBox,
        qrPayload,
        templateUrl: signedTemplate.signedUrl,
      })
      const timestamp = Date.now()
      const fileName = buildInvitationFileName({
        accessCode,
        firstName: attendee.first_name,
        fullName: getAttendeeName(attendee),
        lastName: attendee.last_name,
        qrToken,
      })
      const storagePath = buildInvitationStoragePath({
        accessCode,
        attendeeId: attendee.id,
        eventId,
        firstName: attendee.first_name,
        fullName: getAttendeeName(attendee),
        lastName: attendee.last_name,
        qrToken,
        timestamp,
      })

      const { error: uploadError } = await supabase.storage
        .from(GENERATED_INVITATIONS_BUCKET)
        .upload(storagePath, invitationBlob, {
          contentType: 'image/png',
          upsert: false,
        })

      if (uploadError) throw uploadError

      const generatedAt = new Date().toISOString()
      const generatedBy = sessionData.session?.user.id ?? null

      const { error: invitationError } = await supabase.from('generated_invitations').insert({
        access_code: accessCode,
        attendee_id: attendee.id,
        bucket: GENERATED_INVITATIONS_BUCKET,
        delivery_channel: 'download',
        event_id: eventId,
        file_name: fileName,
        generated_at: generatedAt,
        generated_by: generatedBy,
        mime_type: 'image/png',
        path: storagePath,
        qr_height: qrBox.height,
        qr_payload: qrPayload,
        qr_token: qrToken,
        qr_width: qrBox.width,
        qr_x: qrBox.x,
        qr_y: qrBox.y,
        size_bytes: invitationBlob.size,
        template_bucket: templateBucket,
        template_path: templatePath,
      })

      if (invitationError) throw invitationError

      const { error: attendeeUpdateError } = await supabase
        .from('event_attendees')
        .update({
          invitation_generated_at: generatedAt,
          ticket_generated_at: hasLegalConsent(attendee) ? generatedAt : attendee.ticket_generated_at ?? null,
          ticket_status: hasLegalConsent(attendee) ? 'generated' : getTicketStatus(attendee),
        })
        .eq('id', attendee.id)

      if (attendeeUpdateError) throw attendeeUpdateError

      setMessage('Invitacion generada y guardada en historial.')
      await loadAdminData()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setBusyAction(null)
    }
  }

  async function markInvitationDownloaded(invitation: GeneratedInvitation) {
    const { data: sessionData } = await supabase.auth.getSession()
    const nextDownloadCount = (invitation.download_count ?? 0) + 1
    const downloadedAt = new Date().toISOString()
    const { error } = await supabase
      .from('generated_invitations')
      .update({
        download_count: nextDownloadCount,
        downloaded_at: downloadedAt,
        downloaded_by: sessionData.session?.user.id ?? null,
      })
      .eq('id', invitation.id)

    if (error) throw error

    setInvitations((currentInvitations) =>
      currentInvitations.map((currentInvitation) =>
        currentInvitation.id === invitation.id
          ? {
              ...currentInvitation,
              download_count: nextDownloadCount,
              downloaded_at: downloadedAt,
            }
          : currentInvitation,
      ),
    )
  }

  async function handleDownloadInvitation(invitation: GeneratedInvitation) {
    if (!invitation.path) {
      setErrorMessage('Esta invitacion no tiene archivo asociado.')
      return
    }

    resetMessages()
    setBusyAction(`download:${invitation.id}`)

    try {
      const { data, error } = await supabase.storage
        .from(GENERATED_INVITATIONS_BUCKET)
        .download(invitation.path)

      if (error) throw error
      if (!data) throw new Error('No pudimos descargar la invitacion.')

      const attendee = attendees.find((currentAttendee) => currentAttendee.id === invitation.attendee_id)

      downloadBlob(data, buildInvitationDownloadName(invitation, attendee))
      await markInvitationDownloaded(invitation)
      setMessage('Descarga registrada en historial.')
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setBusyAction(null)
    }
  }

  function handleDownloadLatest(attendee: EventAttendee) {
    const latestInvitation = latestInvitationByAttendeeId.get(attendee.id)

    if (!latestInvitation) {
      setErrorMessage('Este asistente aun no tiene invitaciones generadas.')
      return
    }

    void handleDownloadInvitation(latestInvitation)
  }

  async function handleCopyInvitationLink(invitation: GeneratedInvitation) {
    if (!invitation.path) {
      setErrorMessage('Esta invitacion no tiene archivo asociado.')
      return
    }

    resetMessages()
    setBusyAction(`copy-link:${invitation.id}`)

    try {
      const { data, error } = await supabase.storage
        .from(GENERATED_INVITATIONS_BUCKET)
        .createSignedUrl(invitation.path, 60)

      if (error) throw error
      if (!navigator.clipboard) throw new Error('Clipboard no esta disponible en este navegador.')

      await navigator.clipboard.writeText(data.signedUrl)
      setMessage('Link temporal copiado por 60 segundos.')
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setBusyAction(null)
    }
  }

  async function handleDeleteInvitation(invitation: GeneratedInvitation) {
    if (!invitation.path) {
      setErrorMessage('Esta invitacion no tiene archivo asociado para eliminar.')
      return
    }

    const attendee = attendees.find((currentAttendee) => currentAttendee.id === invitation.attendee_id)
    const fileName = buildInvitationDownloadName(invitation, attendee)
    const confirmed = window.confirm(
      `Eliminar ${fileName}? Se borrara el archivo privado y el registro del historial.`,
    )

    if (!confirmed) return

    resetMessages()
    setBusyAction(`delete:${invitation.id}`)

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) throw sessionError
      if (!sessionData.session) throw new Error('Debes iniciar sesion como administrador para eliminar invitaciones.')

      const { error: storageError } = await supabase.storage
        .from(GENERATED_INVITATIONS_BUCKET)
        .remove([invitation.path])

      if (storageError) {
        throw new Error(
          `No pudimos borrar el archivo en Storage (${invitation.path}): ${storageError.message}. El registro no fue eliminado.`,
        )
      }

      const { error: deleteError } = await supabase
        .from('generated_invitations')
        .delete()
        .eq('id', invitation.id)

      if (deleteError) {
        throw new Error(
          `El archivo se borro en Storage, pero no pudimos borrar el registro del historial: ${deleteError.message}.`,
        )
      }

      setInvitations((currentInvitations) =>
        currentInvitations.filter((currentInvitation) => currentInvitation.id !== invitation.id),
      )
      setMessage('Invitacion eliminada del historial.')
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setBusyAction(null)
    }
  }

  async function handleCopyQrLink(attendee: EventAttendee) {
    resetMessages()
    setBusyAction(`copy-qr:${attendee.id}`)

    try {
      const qrToken = await ensureAttendeeQrToken(attendee)

      if (!navigator.clipboard) throw new Error('Clipboard no esta disponible en este navegador.')

      await navigator.clipboard.writeText(buildAdminCheckInUrl(qrToken, eventId))
      setMessage('Link QR copiado.')
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setBusyAction(null)
    }
  }

  async function handleCopyGuestInvitationLink(attendee: EventAttendee) {
    resetMessages()
    setBusyAction(`copy-guest-link:${attendee.id}`)

    try {
      const invitationToken = await ensureAttendeeInvitationToken(attendee)

      if (!navigator.clipboard) throw new Error('Clipboard no esta disponible en este navegador.')

      await navigator.clipboard.writeText(buildGuestInvitationUrl(invitationToken))
      setMessage('Link unico de invitacion copiado.')
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setBusyAction(null)
    }
  }

  async function handleInvalidateTicket(attendee: EventAttendee) {
    const confirmed = window.confirm(
      `Desvalidar entrada de ${getAttendeeName(attendee)}? Quedará pendiente y podrá volver a escanearse.`,
    )

    if (!confirmed) return

    resetMessages()
    setBusyAction(`invalidate:${attendee.id}`)

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) throw sessionError

      const { error } = await supabase
        .from('event_attendees')
        .update({
          check_in_status: 'pending',
          checked_in_at: null,
          checked_in_by: null,
        })
        .eq('id', attendee.id)

      if (error) throw error

      const { error: logError } = await supabase.from('check_in_logs').insert({
        attendee_id: attendee.id,
        event_id: attendee.event_id || eventId,
        message: 'Entrada desvalidada desde gestion de asistentes.',
        result: 'pending',
        scanned_by: sessionData.session?.user.id ?? null,
        token_scanned: readString(attendee.qr_token) || getAttendeeAccessCode(attendee) || attendee.id,
      })

      if (logError && import.meta.env.DEV) {
        console.warn('[AdminEventAttendees] could not audit invalidate action', logError)
      }

      setMessage('Entrada desvalidada. El QR puede volver a escanearse.')
      await loadAdminData()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setBusyAction(null)
    }
  }

  async function handleCancelInvitation(attendee: EventAttendee) {
    const confirmed = window.confirm(
      `Cancelar invitación de ${getAttendeeName(attendee)}? El QR dejará de validar y el historial se conservará.`,
    )

    if (!confirmed) return

    resetMessages()
    setBusyAction(`cancel:${attendee.id}`)

    try {
      const { error } = await supabase
        .from('event_attendees')
        .update({
          check_in_status: 'cancelled',
          checked_in_at: null,
          checked_in_by: null,
          ticket_status: 'cancelled',
        })
        .eq('id', attendee.id)

      if (error) throw error

      setMessage('Invitacion cancelada. El QR ya no valida.')
      await loadAdminData()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setBusyAction(null)
    }
  }

  async function handleDeleteAttendee(attendee: EventAttendee) {
    const attendeeInvitations = invitations.filter((invitation) => invitation.attendee_id === attendee.id)
    const confirmation = window.prompt(
      `Eliminar asistente ${getAttendeeName(attendee)}? Esto eliminará su registro y ${attendeeInvitations.length} invitación(es) del historial. Escribe ELIMINAR para confirmar.`,
    )

    if (confirmation !== 'ELIMINAR') return

    resetMessages()
    setBusyAction(`delete-attendee:${attendee.id}`)

    try {
      const paths = attendeeInvitations.map((invitation) => readString(invitation.path)).filter(Boolean)

      if (paths.length > 0) {
        const { error: storageError } = await supabase.storage.from(GENERATED_INVITATIONS_BUCKET).remove(paths)

        if (storageError) throw storageError
      }

      const { error } = await supabase.from('event_attendees').delete().eq('id', attendee.id)

      if (error) throw error

      if (historyAttendee?.id === attendee.id) {
        setHistoryAttendee(null)
      }

      setMessage('Asistente eliminado.')
      await loadAdminData()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setBusyAction(null)
    }
  }

  async function handleCopyAccessCode(attendee: EventAttendee) {
    resetMessages()
    setBusyAction(`copy-code:${attendee.id}`)

    try {
      const accessCode = await ensureAttendeeAccessCode(attendee)

      if (!navigator.clipboard) throw new Error('Clipboard no esta disponible en este navegador.')

      await navigator.clipboard.writeText(accessCode)
      setMessage('Codigo copiado.')
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setBusyAction(null)
    }
  }

  async function handleDownloadQrOnly(attendee: EventAttendee) {
    resetMessages()
    setBusyAction(`download-qr:${attendee.id}`)

    try {
      const qrToken = await ensureAttendeeQrToken(attendee)
      const qrBlob = await createQrBlob(buildAdminCheckInUrl(qrToken, eventId), 1024)
      const fileName = `${sanitizeFileName(getAttendeeName(attendee)) || 'asistente'}-qr.png`

      downloadBlob(qrBlob, fileName)
      setMessage('QR descargado.')
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setBusyAction(null)
    }
  }

  const actionsMenuAttendee = actionsMenu
    ? attendees.find((attendee) => attendee.id === actionsMenu.attendeeId) ?? null
    : null
  const isActionsMenuAttendeeValidated = actionsMenuAttendee
    ? readString(actionsMenuAttendee.check_in_status) === 'checked_in' || Boolean(actionsMenuAttendee.checked_in_at)
    : false

  if (!eventId) {
    return (
      <section className="py-20">
        <div className="onda-container">
          <div className="glass-panel rounded-lg p-6 text-center text-sm font-semibold text-zinc-600 dark:text-onda-muted">
            Falta el ID del evento.
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="pb-40 pt-20 sm:pb-44">
      <div className="onda-container">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
          <SectionTitle
            eyebrow="Admin"
            title="Asistentes e invitaciones"
            subtitle={isLoading ? 'Cargando evento...' : eventTitle}
          />
          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <CTAButton
              to="/admin/eventos"
              variant="secondary"
              icon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
            >
              Eventos
            </CTAButton>
            <CTAButton
              to="/admin/check-in"
              variant="secondary"
              icon={<QrCode className="h-4 w-4" aria-hidden="true" />}
            >
              Check-in
            </CTAButton>
            <AdminSignOutButton />
          </div>
        </div>

        {errorMessage ? (
          <div className="mt-6 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-200">
            {errorMessage}
          </div>
        ) : null}

        {message ? (
          <div className="mt-6 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-200">
            {message}
          </div>
        ) : null}

        {isLoading ? (
          <div className="glass-panel mt-10 flex min-h-52 items-center justify-center rounded-lg p-8 text-sm font-semibold text-zinc-600 dark:text-onda-muted">
            <Loader2 className="mr-3 h-5 w-5 animate-spin text-onda-purple" aria-hidden="true" />
            Cargando asistentes...
          </div>
        ) : eventRecord ? (
          <div className="mt-10 grid gap-6">
            <ImageUploader event={eventRecord} onEventUpdated={handleEventImageUpdated} />

            <div className="glass-panel rounded-lg p-5">
              <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-onda-purple/10 text-onda-purple dark:bg-onda-purple/20 dark:text-onda-lavender">
                      <ImagePlus className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="font-display text-lg font-bold uppercase tracking-[0.14em] text-zinc-950 dark:text-white">
                        Plantilla de invitacion
                      </h3>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-onda-muted">
                        Bucket: {eventRecord.invitation_template_bucket || INVITATION_TEMPLATE_BUCKET}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4">
                    <label
                      className={cn(
                        'inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md border border-onda-purple/35 bg-white/65 px-4 py-3 font-display text-xs font-bold uppercase tracking-[0.14em] text-onda-purple transition hover:border-onda-purple hover:bg-onda-purple/10 dark:bg-white/5 dark:text-onda-soft',
                        isUploadingTemplate && 'pointer-events-none opacity-60',
                      )}
                    >
                      {isUploadingTemplate ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Upload className="h-4 w-4" aria-hidden="true" />
                      )}
                      <span>{isUploadingTemplate ? 'Subiendo...' : 'Subir plantilla'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        disabled={isUploadingTemplate}
                        onChange={handleTemplateUpload}
                      />
                    </label>

                    <div className="grid gap-3 sm:grid-cols-4">
                      <label className={labelClassName}>
                        X
                        <input
                          type="number"
                          min="0"
                          value={qrInputValue(qrDraft.x)}
                          onChange={(inputEvent) => handleQrDraftChange('x', inputEvent.target.value)}
                          className={inputClassName}
                        />
                      </label>
                      <label className={labelClassName}>
                        Y
                        <input
                          type="number"
                          min="0"
                          value={qrInputValue(qrDraft.y)}
                          onChange={(inputEvent) => handleQrDraftChange('y', inputEvent.target.value)}
                          className={inputClassName}
                        />
                      </label>
                      <label className={labelClassName}>
                        Ancho
                        <input
                          type="number"
                          min="32"
                          value={qrInputValue(qrDraft.width)}
                          onChange={(inputEvent) => handleQrDraftChange('width', inputEvent.target.value)}
                          className={inputClassName}
                        />
                      </label>
                      <label className={labelClassName}>
                        Alto
                        <input
                          type="number"
                          min="32"
                          value={qrInputValue(qrDraft.height)}
                          onChange={(inputEvent) => handleQrDraftChange('height', inputEvent.target.value)}
                          className={inputClassName}
                        />
                      </label>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <CTAButton
                        type="button"
                        variant="primary"
                        icon={<Save className="h-4 w-4" aria-hidden="true" />}
                        onClick={handleSaveQrBox}
                        disabled={isSavingQrBox}
                      >
                        {isSavingQrBox ? 'Guardando...' : 'Guardar posicion'}
                      </CTAButton>
                      <CTAButton
                        type="button"
                        variant="secondary"
                        icon={<Eye className="h-4 w-4" aria-hidden="true" />}
                        onClick={handleTestQrPosition}
                      >
                        Probar posicion QR
                      </CTAButton>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-onda-purple/20 bg-white/55 p-3 dark:bg-white/5">
                  {templatePreviewUrl ? (
                    <div className="relative overflow-hidden rounded-md bg-onda-black">
                      <img
                        src={templatePreviewUrl}
                        alt="Preview plantilla invitacion"
                        className="h-auto w-full"
                        onLoad={(imageEvent) =>
                          setTemplateImageSize({
                            height: imageEvent.currentTarget.naturalHeight,
                            width: imageEvent.currentTarget.naturalWidth,
                          })
                        }
                      />
                      {canShowQrOverlay ? (
                        <>
                          <img
                            src={qrPreviewDataUrl}
                            alt="Preview QR"
                            className="absolute border-2 border-onda-lavender shadow-[0_0_28px_rgba(192,132,252,0.7)]"
                            style={{
                              height: `${(previewQrBox.height / templateImageSize.height) * 100}%`,
                              left: `${(previewQrBox.x / templateImageSize.width) * 100}%`,
                              top: `${(previewQrBox.y / templateImageSize.height) * 100}%`,
                              width: `${(previewQrBox.width / templateImageSize.width) * 100}%`,
                            }}
                          />
                          <span
                            className="absolute font-sans font-black tracking-[0.08em]"
                            style={{
                              color: previewAccessCodePlacement.color,
                              fontSize: `clamp(10px, ${(previewAccessCodePlacement.fontSize / templateImageSize.width) * 100}vw, ${previewAccessCodePlacement.fontSize}px)`,
                              left: `${(previewAccessCodePlacement.x / templateImageSize.width) * 100}%`,
                              lineHeight: 1,
                              maxWidth: `${((templateImageSize.width - previewAccessCodePlacement.x * 2) / templateImageSize.width) * 100}%`,
                              textShadow: `0 2px 8px ${previewAccessCodePlacement.shadowColor}`,
                              top: `${((previewAccessCodePlacement.y - previewAccessCodePlacement.fontSize) / templateImageSize.height) * 100}%`,
                            }}
                          >
                            {getAccessCodeText('DEMO123')}
                          </span>
                        </>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex min-h-72 items-center justify-center rounded-md border border-dashed border-onda-purple/35 text-center text-sm font-semibold text-zinc-500 dark:text-onda-muted">
                      Sin plantilla cargada.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
              <form className="glass-panel grid gap-4 rounded-lg p-5" onSubmit={handleAttendeeSubmit}>
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-onda-purple/10 text-onda-purple dark:bg-onda-purple/20 dark:text-onda-lavender">
                    <Users className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold uppercase tracking-[0.14em] text-zinc-950 dark:text-white">
                      {editingAttendeeId ? 'Editar asistente' : 'Nuevo asistente'}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-onda-muted">
                      {editingAttendeeId ? 'Actualiza datos y full_name.' : 'Crea asistentes con QR unico.'}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={labelClassName}>
                    Nombre
                    <input
                      type="text"
                      value={attendeeForm.firstName}
                      onChange={(inputEvent) =>
                        setAttendeeForm((current) => ({ ...current, firstName: inputEvent.target.value }))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <label className={labelClassName}>
                    Apellido
                    <input
                      type="text"
                      value={attendeeForm.lastName}
                      onChange={(inputEvent) =>
                        setAttendeeForm((current) => ({ ...current, lastName: inputEvent.target.value }))
                      }
                      className={inputClassName}
                    />
                  </label>
                </div>

                <label className={labelClassName}>
                  Correo opcional
                  <input
                    type="email"
                    value={attendeeForm.email}
                    onChange={(inputEvent) =>
                      setAttendeeForm((current) => ({ ...current, email: inputEvent.target.value }))
                    }
                    className={inputClassName}
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={labelClassName}>
                    @Instagram
                    <input
                      type="text"
                      value={attendeeForm.instagramHandle}
                      onChange={(inputEvent) =>
                        setAttendeeForm((current) => ({
                          ...current,
                          instagramHandle: inputEvent.target.value,
                        }))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <label className={labelClassName}>
                    Telefono
                    <input
                      type="tel"
                      value={attendeeForm.phone}
                      onChange={(inputEvent) =>
                        setAttendeeForm((current) => ({ ...current, phone: inputEvent.target.value }))
                      }
                      className={inputClassName}
                    />
                  </label>
                </div>

                <label className={labelClassName}>
                  Tipo de invitado
                  <input
                    type="text"
                    value={attendeeForm.guestType}
                    onChange={(inputEvent) =>
                      setAttendeeForm((current) => ({ ...current, guestType: inputEvent.target.value }))
                    }
                    className={inputClassName}
                  />
                </label>

                <label className={labelClassName}>
                  Notas
                  <textarea
                    rows={4}
                    value={attendeeForm.notes}
                    onChange={(inputEvent) =>
                      setAttendeeForm((current) => ({ ...current, notes: inputEvent.target.value }))
                    }
                    className={inputClassName}
                  />
                </label>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <CTAButton
                    type="submit"
                    variant="primary"
                    icon={<Check className="h-4 w-4" aria-hidden="true" />}
                    disabled={isSavingAttendee}
                  >
                    {isSavingAttendee ? 'Guardando...' : editingAttendeeId ? 'Actualizar' : 'Crear asistente'}
                  </CTAButton>
                  {editingAttendeeId ? (
                    <CTAButton type="button" variant="secondary" onClick={resetAttendeeForm}>
                      Cancelar
                    </CTAButton>
                  ) : null}
                </div>
              </form>

              <div className="glass-panel overflow-hidden rounded-lg">
                <div className="flex items-center justify-between gap-3 border-b border-onda-purple/10 px-5 py-4">
                  <div>
                    <h3 className="font-display text-lg font-bold uppercase tracking-[0.14em] text-zinc-950 dark:text-white">
                      Gestion de asistentes
                    </h3>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-onda-muted">
                      {attendees.length} asistentes registrados
                    </p>
                  </div>
                  <Clock3 className="h-5 w-5 text-onda-purple dark:text-onda-lavender" aria-hidden="true" />
                </div>

                {attendees.length === 0 ? (
                  <div className="p-6 text-sm font-semibold text-zinc-600 dark:text-onda-muted">
                    Todavia no hay asistentes para este evento.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1180px] text-left text-sm">
                      <thead className="bg-onda-purple/10 text-xs uppercase tracking-[0.14em] text-onda-purple dark:text-onda-lavender">
                        <tr>
                          <th className="px-4 py-3">Asistente</th>
                          <th className="px-4 py-3">Entrada</th>
                          <th className="px-4 py-3">Consentimiento</th>
                          <th className="px-4 py-3">Comunidad</th>
                          <th className="px-4 py-3">Codigo</th>
                          <th className="px-4 py-3">Contacto</th>
                          <th className="px-4 py-3">Ultima invitacion</th>
                          <th className="px-4 py-3">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-onda-purple/10">
                        {attendees.map((attendee) => {
                          const latestInvitation = latestInvitationByAttendeeId.get(attendee.id)
                          const accessCode = getAttendeeAccessCode(attendee)
                          const isActionsMenuOpen = actionsMenu?.attendeeId === attendee.id

                          return (
                            <tr key={attendee.id}>
                              <td className="px-4 py-4 align-top">
                                <div className="font-semibold text-zinc-950 dark:text-white">
                                  {getAttendeeName(attendee)}
                                </div>
                                <div className="mt-1 text-xs text-zinc-500 dark:text-onda-muted">
                                  {attendee.guest_type || 'Sin tipo'} {attendee.notes ? `- ${attendee.notes}` : ''}
                                </div>
                              </td>
                              <td className="px-4 py-4 align-top">
                                <span
                                  className={cn(
                                    'inline-flex rounded-md border px-2.5 py-1.5 text-xs font-bold',
                                    getTicketStatusClassName(attendee),
                                  )}
                                >
                                  {getTicketStatusLabel(attendee)}
                                </span>
                                <div className="mt-2 text-xs text-zinc-500 dark:text-onda-muted">
                                  Check-in: {getCheckInStatusLabel(attendee)}
                                </div>
                              </td>
                              <td className="px-4 py-4 align-top">
                                <span
                                  className={cn(
                                    'inline-flex rounded-md border px-2.5 py-1.5 text-xs font-bold',
                                    getConsentStatusClassName(attendee),
                                  )}
                                >
                                  {getConsentStatusLabel(attendee)}
                                </span>
                              </td>
                              <td className="px-4 py-4 align-top text-zinc-600 dark:text-onda-muted">
                                <div className="font-semibold text-zinc-950 dark:text-white">
                                  {attendee.community_consent ? 'Si' : 'No'}
                                </div>
                                <div className="mt-1 text-xs">
                                  {attendee.community_consent_at ? formatDateTime(attendee.community_consent_at) : 'Sin fecha'}
                                </div>
                              </td>
                              <td className="px-4 py-4 align-top">
                                <div className="font-display text-base font-extrabold tracking-[0.12em] text-zinc-950 dark:text-white">
                                  {accessCode || 'Pendiente'}
                                </div>
                              </td>
                              <td className="px-4 py-4 align-top text-zinc-600 dark:text-onda-muted">
                                <div>{attendee.email || 'Sin correo'}</div>
                                <div className="mt-1">{attendee.instagram_handle || 'Sin Instagram'}</div>
                                <div className="mt-1">{attendee.phone || 'Sin telefono'}</div>
                              </td>
                              <td className="px-4 py-4 align-top text-zinc-600 dark:text-onda-muted">
                                <div>{latestInvitation ? formatDateTime(latestInvitation.generated_at) : 'Sin fecha'}</div>
                                <div className="mt-1 text-xs">
                                  {latestInvitation
                                    ? `${formatFileSize(latestInvitation.size_bytes)} - ${latestInvitation.download_count ?? 0} descargas`
                                    : 'Sin historial'}
                                </div>
                              </td>
                              <td className="px-4 py-4 align-top">
                                <div className="flex flex-wrap gap-2">
                                  <ActionButton
                                    icon={
                                      isBusy('generate', attendee.id) ? (
                                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                      ) : (
                                        <ImagePlus className="h-4 w-4" aria-hidden="true" />
                                      )
                                    }
                                    onClick={() => void handleGenerateInvitation(attendee)}
                                    disabled={Boolean(busyAction)}
                                    variant="primary"
                                  >
                                    Generar invitación
                                  </ActionButton>
                                  <ActionButton
                                    icon={<Download className="h-4 w-4" aria-hidden="true" />}
                                    onClick={() => handleDownloadLatest(attendee)}
                                    disabled={!latestInvitation || Boolean(busyAction)}
                                  >
                                    Descargar última
                                  </ActionButton>
                                  <ActionButton
                                    icon={<Clipboard className="h-4 w-4" aria-hidden="true" />}
                                    onClick={() => void handleCopyGuestInvitationLink(attendee)}
                                    disabled={Boolean(busyAction)}
                                  >
                                    Copiar link invitación
                                  </ActionButton>
                                  <ActionButton
                                    icon={<History className="h-4 w-4" aria-hidden="true" />}
                                    onClick={() => setHistoryAttendee(attendee)}
                                  >
                                    Ver historial
                                  </ActionButton>
                                  <button
                                    type="button"
                                    data-attendee-actions-trigger
                                    onClick={(clickEvent) => toggleActionsMenu(attendee.id, clickEvent.currentTarget)}
                                    className={cn(
                                      'inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-md border px-3.5 py-2.5 font-display text-[0.64rem] font-bold uppercase leading-tight tracking-[0.12em] transition duration-300',
                                      actionButtonVariants.ghost,
                                      isActionsMenuOpen && 'border-onda-purple/45 bg-onda-purple/10',
                                    )}
                                    aria-expanded={isActionsMenuOpen}
                                    aria-haspopup="menu"
                                  >
                                    <MoreVertical className="h-4 w-4" aria-hidden="true" />
                                    <span>Más acciones</span>
                                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-panel mt-10 rounded-lg p-6 text-sm font-semibold text-zinc-600 dark:text-onda-muted">
            No encontramos este evento.
          </div>
        )}
      </div>

      {actionsMenu && actionsMenuAttendee && typeof document !== 'undefined'
        ? createPortal(
            <div
              data-attendee-actions-menu
              role="menu"
              className={cn(
                'fixed z-[90] overflow-y-auto rounded-lg border border-onda-purple/18 bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.24)] dark:bg-onda-black',
                actionsMenu.placement === 'top' && '-translate-y-full',
              )}
              style={{
                left: actionsMenu.left,
                maxHeight: actionsMenu.maxHeight,
                top: actionsMenu.top,
                width: actionsMenu.width,
              }}
            >
              <ActionsMenuItem
                icon={<Edit3 className="h-4 w-4" aria-hidden="true" />}
                onClick={() => runActionsMenuAction(() => handleEditAttendee(actionsMenuAttendee))}
                disabled={Boolean(busyAction)}
              >
                Editar
              </ActionsMenuItem>
              <ActionsMenuItem
                icon={<Clipboard className="h-4 w-4" aria-hidden="true" />}
                onClick={() => runActionsMenuAction(() => void handleCopyAccessCode(actionsMenuAttendee))}
                disabled={Boolean(busyAction)}
              >
                Copiar código
              </ActionsMenuItem>
              <ActionsMenuItem
                icon={<Clipboard className="h-4 w-4" aria-hidden="true" />}
                onClick={() => runActionsMenuAction(() => void handleCopyQrLink(actionsMenuAttendee))}
                disabled={Boolean(busyAction)}
              >
                Copiar link QR
              </ActionsMenuItem>
              <ActionsMenuItem
                icon={<QrCode className="h-4 w-4" aria-hidden="true" />}
                onClick={() => runActionsMenuAction(() => void handleDownloadQrOnly(actionsMenuAttendee))}
                disabled={Boolean(busyAction)}
              >
                Descargar QR solo
              </ActionsMenuItem>
              <div className="my-2 h-px bg-onda-purple/12" />
              <ActionsMenuItem
                icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
                onClick={() => runActionsMenuAction(() => void handleInvalidateTicket(actionsMenuAttendee))}
                disabled={Boolean(busyAction) || !isActionsMenuAttendeeValidated}
              >
                Desvalidar entrada
              </ActionsMenuItem>
              <ActionsMenuItem
                icon={<Ban className="h-4 w-4" aria-hidden="true" />}
                onClick={() => runActionsMenuAction(() => void handleCancelInvitation(actionsMenuAttendee))}
                disabled={
                  Boolean(busyAction) ||
                  getTicketStatus(actionsMenuAttendee) === 'cancelled' ||
                  getTicketStatus(actionsMenuAttendee) === 'used'
                }
                danger
              >
                Cancelar invitación
              </ActionsMenuItem>
              <ActionsMenuItem
                icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                onClick={() => runActionsMenuAction(() => void handleDeleteAttendee(actionsMenuAttendee))}
                disabled={Boolean(busyAction)}
                danger
              >
                Eliminar asistente
              </ActionsMenuItem>
            </div>,
            document.body,
          )
        : null}

      {historyAttendee ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/72 px-4 py-6 backdrop-blur-sm">
          <div className="glass-panel max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-lg">
            <div className="flex items-start justify-between gap-4 border-b border-onda-purple/15 px-5 py-4">
              <div>
                <p className="font-display text-xs font-bold uppercase tracking-[0.22em] text-onda-purple dark:text-onda-lavender">
                  Historial
                </p>
                <h3 className="mt-2 font-display text-xl font-bold uppercase tracking-[0.12em] text-zinc-950 dark:text-white">
                  {getAttendeeName(historyAttendee)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setHistoryAttendee(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-onda-purple/25 bg-white/70 text-onda-purple transition hover:bg-onda-purple hover:text-white dark:bg-white/5 dark:text-onda-soft"
                aria-label="Cerrar historial"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="max-h-[68vh] overflow-y-auto p-5">
              {historyItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-onda-purple/25 p-5 text-sm font-semibold text-zinc-600 dark:text-onda-muted">
                  Este asistente no tiene invitaciones generadas.
                </div>
              ) : (
                <div className="grid gap-3">
                  {historyItems.map((invitation) => {
                    const invitationAccessCode = getInvitationAccessCode(invitation, historyAttendee)
                    const downloadFileName = buildInvitationDownloadName(invitation, historyAttendee)

                    return (
                      <div
                        key={invitation.id}
                        className="rounded-lg border border-onda-purple/18 bg-white/58 p-4 dark:bg-white/5"
                      >
                        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
                          <div className="text-sm text-zinc-600 dark:text-onda-muted">
                            <div className="font-semibold text-zinc-950 dark:text-white">
                              {formatDateTime(invitation.generated_at)}
                            </div>
                            <div className="mt-1">Generado por: {formatUserId(invitation.generated_by)}</div>
                            <div className="mt-1">Codigo: {invitationAccessCode || 'Sin codigo'}</div>
                            <div className="mt-1">Archivo: {downloadFileName}</div>
                            <div className="mt-1">Canal: {invitation.delivery_channel || 'download'}</div>
                            <div className="mt-1">
                              Tamano: {formatFileSize(invitation.size_bytes)} - Descargas:{' '}
                              {invitation.download_count ?? 0}
                            </div>
                            <div className="mt-1">Ultima descarga: {formatDateTime(invitation.downloaded_at)}</div>
                          </div>
                          <div className="flex flex-wrap gap-2 md:justify-end">
                            <ActionButton
                              icon={<Download className="h-4 w-4" aria-hidden="true" />}
                              onClick={() => void handleDownloadInvitation(invitation)}
                              disabled={Boolean(busyAction)}
                              variant="primary"
                            >
                              Descargar
                            </ActionButton>
                            <ActionButton
                              icon={<Clipboard className="h-4 w-4" aria-hidden="true" />}
                              onClick={() => void handleCopyInvitationLink(invitation)}
                              disabled={Boolean(busyAction)}
                            >
                              Copiar link
                            </ActionButton>
                            <ActionButton
                              icon={
                                isBusy('delete', invitation.id) ? (
                                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                ) : (
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                )
                              }
                              onClick={() => void handleDeleteInvitation(invitation)}
                              disabled={Boolean(busyAction)}
                              variant="danger"
                            >
                              Eliminar
                            </ActionButton>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
