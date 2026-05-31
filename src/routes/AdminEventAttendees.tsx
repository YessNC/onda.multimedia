import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import {
  ArrowLeft,
  Check,
  Clipboard,
  Clock3,
  Download,
  Edit3,
  Eye,
  History,
  ImagePlus,
  Loader2,
  QrCode,
  Save,
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
  createQrBlob,
  createQrDataUrl,
  downloadBlob,
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
  check_in_status?: string | null
  checked_in_at?: string | null
  email?: string | null
  event_id?: string | null
  first_name?: string | null
  full_name?: string | null
  guest_type?: string | null
  id: string
  instagram_handle?: string | null
  invitation_generated_at?: string | null
  last_name?: string | null
  notes?: string | null
  phone?: string | null
  qr_token?: string | null
}

type GeneratedInvitation = Record<string, unknown> & {
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
  ghost:
    'border-white/10 bg-white/5 text-zinc-700 hover:border-onda-purple/40 hover:bg-onda-purple/10 dark:text-onda-soft',
  primary:
    'border-onda-purple bg-onda-purple text-white shadow-[0_0_22px_rgba(123,44,255,0.28)] hover:bg-onda-electric',
  secondary:
    'border-onda-purple/35 bg-white/65 text-onda-purple hover:border-onda-purple hover:bg-onda-purple/10 dark:bg-white/5 dark:text-onda-soft',
}

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
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 py-2 font-display text-[0.64rem] font-bold uppercase tracking-[0.12em] transition duration-300 disabled:cursor-not-allowed disabled:opacity-50',
        actionButtonVariants[variant],
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

function getAttendeeAccessCode(attendee: EventAttendee | null | undefined) {
  return normalizeAccessCode(readString(attendee?.access_code))
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

    if (currentCode) {
      nextAttendees.push({ ...attendee, access_code: currentCode })
      continue
    }

    const accessCode = await createUniqueAccessCodeForEvent(eventId, reservedCodes)
    const { data, error } = await supabase
      .from('event_attendees')
      .update({ access_code: accessCode })
      .eq('id', attendee.id)
      .select('*')
      .single()

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

function getCheckInStatusClassName(attendee: EventAttendee) {
  const status = readString(attendee.check_in_status)

  if (status === 'checked_in') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
  }

  if (status === 'cancelled') {
    return 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200'
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
      const attendeeFileName = sanitizeFileName(getAttendeeName(attendee)) || 'asistente'
      const fileName = `${attendeeFileName}-invitation.png`
      const storagePath = `events/${eventId}/attendees/${attendee.id}/${timestamp}-invitation.png`

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
        .update({ invitation_generated_at: generatedAt })
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

      downloadBlob(data, invitation.file_name || 'invitacion-onda.png')
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
    <section className="py-20">
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
                            className="absolute text-center font-sans font-black tracking-[0.08em] text-black"
                            style={{
                              fontSize: 'clamp(10px, 2vw, 18px)',
                              left: `${(previewQrBox.x / templateImageSize.width) * 100}%`,
                              top: `${((previewQrBox.y + previewQrBox.height + 18) / templateImageSize.height) * 100}%`,
                              width: `${(previewQrBox.width / templateImageSize.width) * 100}%`,
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
                    <table className="w-full min-w-[1120px] text-left text-sm">
                      <thead className="bg-onda-purple/10 text-xs uppercase tracking-[0.14em] text-onda-purple dark:text-onda-lavender">
                        <tr>
                          <th className="px-4 py-3">Asistente</th>
                          <th className="px-4 py-3">Check-in</th>
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
                                    getCheckInStatusClassName(attendee),
                                  )}
                                >
                                  {getCheckInStatusLabel(attendee)}
                                </span>
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
                                <div>{formatDateTime(attendee.invitation_generated_at)}</div>
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
                                    Generar invitacion
                                  </ActionButton>
                                  <ActionButton
                                    icon={<Download className="h-4 w-4" aria-hidden="true" />}
                                    onClick={() => handleDownloadLatest(attendee)}
                                    disabled={!latestInvitation || Boolean(busyAction)}
                                  >
                                    Descargar ultima
                                  </ActionButton>
                                  <ActionButton
                                    icon={<History className="h-4 w-4" aria-hidden="true" />}
                                    onClick={() => setHistoryAttendee(attendee)}
                                  >
                                    Ver historial
                                  </ActionButton>
                                  <ActionButton
                                    icon={<Clipboard className="h-4 w-4" aria-hidden="true" />}
                                    onClick={() => void handleCopyAccessCode(attendee)}
                                    disabled={Boolean(busyAction)}
                                  >
                                    Copiar codigo
                                  </ActionButton>
                                  <ActionButton
                                    icon={<Clipboard className="h-4 w-4" aria-hidden="true" />}
                                    onClick={() => void handleCopyQrLink(attendee)}
                                    disabled={Boolean(busyAction)}
                                  >
                                    Copiar link QR
                                  </ActionButton>
                                  <ActionButton
                                    icon={<QrCode className="h-4 w-4" aria-hidden="true" />}
                                    onClick={() => void handleDownloadQrOnly(attendee)}
                                    disabled={Boolean(busyAction)}
                                  >
                                    Descargar QR solo
                                  </ActionButton>
                                  <ActionButton
                                    icon={<Edit3 className="h-4 w-4" aria-hidden="true" />}
                                    onClick={() => handleEditAttendee(attendee)}
                                    variant="ghost"
                                  >
                                    Editar
                                  </ActionButton>
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
                  {historyItems.map((invitation) => (
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
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
