import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { AlertTriangle, CalendarDays, CheckCircle2, Download, Loader2, QrCode, ShieldCheck, Ticket, UserRound } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import CTAButton from '../components/shared/CTAButton'
import {
  DEFAULT_QR_BOX,
  GENERATED_INVITATIONS_BUCKET,
  INVITATION_TEMPLATE_BUCKET,
  buildAdminCheckInUrl,
  buildAttendeeFullName,
  buildInvitationFileName,
  createQrDataUrl,
  downloadBlob,
  normalizeQrBox,
  renderInvitationPng,
} from '../lib/invitations'
import { formatEventDate, readString } from '../lib/events'
import { supabase } from '../lib/supabaseClient'
import { cn } from '../lib/utils'

type GuestInvitationRecord = {
  accepted_privacy?: boolean | null
  accepted_terms?: boolean | null
  access_code?: string | null
  attendee_id: string
  check_in_status?: string | null
  checked_in_at?: string | null
  community_consent?: boolean | null
  community_consent_at?: string | null
  consent_at?: string | null
  email?: string | null
  event_date?: string | null
  event_description?: string | null
  event_id: string
  event_location?: string | null
  event_title?: string | null
  first_name?: string | null
  full_name?: string | null
  guest_type?: string | null
  invitation_expires_at?: string | null
  invitation_qr_height?: number | string | null
  invitation_qr_width?: number | string | null
  invitation_qr_x?: number | string | null
  invitation_qr_y?: number | string | null
  invitation_template_bucket?: string | null
  invitation_template_path?: string | null
  invitation_token: string
  last_name?: string | null
  latest_invitation_bucket?: string | null
  latest_invitation_download_count?: number | null
  latest_invitation_file_name?: string | null
  latest_invitation_generated_at?: string | null
  latest_invitation_path?: string | null
  phone?: string | null
  qr_token?: string | null
  ticket_downloaded_at?: string | null
  ticket_generated_at?: string | null
  ticket_status?: string | null
}

type GenerateGuestInvitationResult = {
  access_code?: string | null
  attendee_id?: string | null
  event_id?: string | null
  invitation_token?: string | null
  message?: string | null
  qr_token?: string | null
  result?: string | null
  ticket_generated_at?: string | null
  ticket_status?: string | null
}

type GuestFormState = {
  communityConsent: boolean
  email: string
  firstName: string
  guestType: string
  lastName: string
  legalAccepted: boolean
  phone: string
}

const emptyForm: GuestFormState = {
  communityConsent: false,
  email: '',
  firstName: '',
  guestType: '',
  lastName: '',
  legalAccepted: false,
  phone: '',
}

const rawOccupationOptions = [
  'Producción Musical',
  'Artista',
  'Producción Ejecutivo',
  'Dirección Creativa',
  'Producción Audiovisual',
  'Modelaje',
  'Danza',
  'Empresario',
  'Representante de Marca',
  'Público General',
  'Actuación',
  'Animación',
  'Beatmaking',
  'Creación de Contenido',
  'DJ',
  'Diseño Gráfico',
  'Diseño de Vestuario',
  'Fotografía',
  'Influencer',
  'Sonidista',
  'Maquillaje',
  'Prensa Producción de Eventos',
  'Iluminación',
  'Manager (Stage, Tour, otros)',
  'Filmmaker',
  'Otro',
]

const occupationOptions = [...rawOccupationOptions].sort((first, second) => first.localeCompare(second, 'es'))

const inputClassName =
  'min-h-12 rounded-md border border-onda-purple/25 bg-white/7 px-4 py-3 text-sm text-white outline-none transition placeholder:text-onda-muted/65 focus:border-onda-lavender'
const labelClassName = 'grid gap-2 text-sm font-semibold text-onda-soft'

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Ocurrió un error inesperado.'
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

function getAttendeeName(record: GuestInvitationRecord | null) {
  if (!record) return 'Asistente'

  return (
    readString(record.full_name) ||
    buildAttendeeFullName(readString(record.first_name), readString(record.last_name)) ||
    'Asistente'
  )
}

function getTicketStatus(record: GuestInvitationRecord | null) {
  if (!record) return 'invalid'

  const checkInStatus = readString(record.check_in_status)

  if (checkInStatus === 'checked_in' || record.checked_in_at) return 'used'
  if (checkInStatus === 'cancelled') return 'cancelled'

  return readString(record.ticket_status) || 'pending'
}

function getTicketStatusLabel(status: string) {
  if (status === 'generated') return 'Entrada generada'
  if (status === 'used') return 'Entrada utilizada'
  if (status === 'cancelled') return 'Entrada cancelada'
  if (status === 'expired') return 'Invitación vencida'
  return 'Entrada pendiente'
}

function getFormStateFromInvitation(record: GuestInvitationRecord): GuestFormState {
  return {
    communityConsent: Boolean(record.community_consent),
    email: readString(record.email),
    firstName: readString(record.first_name),
    guestType: readString(record.guest_type),
    lastName: readString(record.last_name),
    legalAccepted: Boolean(record.accepted_privacy && record.accepted_terms),
    phone: readString(record.phone),
  }
}

function readQrBox(record: GuestInvitationRecord) {
  return normalizeQrBox({
    height: record.invitation_qr_height ?? DEFAULT_QR_BOX.height,
    width: record.invitation_qr_width ?? DEFAULT_QR_BOX.width,
    x: record.invitation_qr_x ?? DEFAULT_QR_BOX.x,
    y: record.invitation_qr_y ?? DEFAULT_QR_BOX.y,
  })
}

function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('No pudimos exportar la entrada como PNG.'))
        return
      }

      resolve(blob)
    }, 'image/png')
  })
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()

    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('No pudimos cargar el QR para la entrada.'))
    image.src = src
  })
}

function wrapCanvasText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(/\s+/)
  let line = ''
  let nextY = y

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word
    const width = context.measureText(testLine).width

    if (width > maxWidth && line) {
      context.fillText(line, x, nextY)
      line = word
      nextY += lineHeight
    } else {
      line = testLine
    }
  }

  if (line) {
    context.fillText(line, x, nextY)
  }
}

async function renderFallbackTicketPng(record: GuestInvitationRecord, qrPayload: string) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas no está disponible en este navegador.')
  }

  canvas.width = 1080
  canvas.height = 1600

  const qrDataUrl = await createQrDataUrl(qrPayload, 820)
  const qrImage = await loadImage(qrDataUrl)
  const eventTitle = readString(record.event_title) || 'Evento ONDA'
  const attendeeName = getAttendeeName(record)
  const eventDate = record.event_date ? formatEventDate(record.event_date) : 'Fecha por confirmar'
  const eventLocation = readString(record.event_location) || 'Ubicación por confirmar'
  const accessCode = readString(record.access_code)

  context.fillStyle = '#050505'
  context.fillRect(0, 0, canvas.width, canvas.height)

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height)
  gradient.addColorStop(0, 'rgba(123,44,255,0.55)')
  gradient.addColorStop(0.5, 'rgba(192,132,252,0.16)')
  gradient.addColorStop(1, 'rgba(5,5,5,0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  context.strokeStyle = 'rgba(192,132,252,0.55)'
  context.lineWidth = 4
  context.strokeRect(58, 58, canvas.width - 116, canvas.height - 116)

  context.fillStyle = '#c084fc'
  context.font = '700 34px Arial, Helvetica, sans-serif'
  context.fillText('ONDA MULTIMEDIA', 90, 150)

  context.fillStyle = '#ffffff'
  context.font = '800 64px Arial, Helvetica, sans-serif'
  wrapCanvasText(context, eventTitle.toUpperCase(), 90, 250, 900, 74)

  context.fillStyle = '#f5f3ff'
  context.font = '700 38px Arial, Helvetica, sans-serif'
  context.fillText(attendeeName, 90, 480)

  context.fillStyle = '#a1a1aa'
  context.font = '500 30px Arial, Helvetica, sans-serif'
  context.fillText(eventDate, 90, 545)
  wrapCanvasText(context, eventLocation, 90, 595, 900, 40)

  context.fillStyle = '#ffffff'
  context.fillRect(210, 720, 660, 660)
  context.drawImage(qrImage, 230, 740, 620, 620)

  if (accessCode) {
    context.fillStyle = '#ffffff'
    context.font = '800 34px Arial, Helvetica, sans-serif'
    context.textAlign = 'center'
    context.fillText(`CÓDIGO: ${accessCode}`, canvas.width / 2, 1450)
    context.textAlign = 'left'
  }

  return canvasToPngBlob(canvas)
}

export default function GuestInvitation() {
  const { invitationToken: routeToken } = useParams<{ invitationToken: string }>()
  const [searchParams] = useSearchParams()
  const invitationToken = readString(routeToken) || readString(searchParams.get('token'))
  const [errorMessage, setErrorMessage] = useState('')
  const [form, setForm] = useState<GuestFormState>(emptyForm)
  const [invitation, setInvitation] = useState<GuestInvitationRecord | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [previewImageUrl, setPreviewImageUrl] = useState('')
  const [qrPreviewDataUrl, setQrPreviewDataUrl] = useState('')

  const ticketStatus = getTicketStatus(invitation)
  const attendeeName = getAttendeeName(invitation)
  const eventTitle = readString(invitation?.event_title) || 'Evento ONDA'
  const hasDownloadableTicket = ticketStatus === 'generated' || ticketStatus === 'used'

  const loadInvitation = useCallback(async () => {
    setErrorMessage('')
    setMessage('')

    if (!invitationToken) {
      setInvitation(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      const { data, error } = await supabase.rpc('get_guest_invitation', {
        p_invitation_token: invitationToken,
      })

      if (error) throw error

      const record = Array.isArray(data) ? (data[0] as GuestInvitationRecord | undefined) : null

      setInvitation(record ?? null)
      if (record) {
        setForm(getFormStateFromInvitation(record))
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
      setInvitation(null)
    } finally {
      setIsLoading(false)
    }
  }, [invitationToken])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadInvitation()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadInvitation])

  useEffect(() => {
    let isMounted = true

    async function loadPreview() {
      setPreviewImageUrl('')
      setQrPreviewDataUrl('')

      if (!invitation?.qr_token || !invitation.event_id) return

      const qrPayload = buildAdminCheckInUrl(invitation.qr_token, invitation.event_id)
      const latestPath = readString(invitation.latest_invitation_path)
      const latestBucket = readString(invitation.latest_invitation_bucket) || GENERATED_INVITATIONS_BUCKET

      if (latestPath) {
        const { data, error } = await supabase.storage.from(latestBucket).createSignedUrl(latestPath, 300)

        if (isMounted && !error && data?.signedUrl) {
          setPreviewImageUrl(data.signedUrl)
          return
        }
      }

      const dataUrl = await createQrDataUrl(qrPayload, 768)

      if (isMounted) {
        setQrPreviewDataUrl(dataUrl)
      }
    }

    void loadPreview()

    return () => {
      isMounted = false
    }
  }, [invitation?.event_id, invitation?.latest_invitation_bucket, invitation?.latest_invitation_path, invitation?.qr_token])

  const guestTypeOptions = useMemo(() => {
    if (!form.guestType || occupationOptions.includes(form.guestType)) return occupationOptions
    return [form.guestType, ...occupationOptions]
  }, [form.guestType])

  function resetMessages() {
    setErrorMessage('')
    setMessage('')
  }

  function validateForm() {
    if (!form.firstName.trim() || !form.lastName.trim()) return 'Ingresa nombre y apellido.'
    if (!form.email.trim() || !form.email.includes('@')) return 'Ingresa un correo electrónico válido.'
    if (!form.phone.trim()) return 'Ingresa tu teléfono.'
    if (!form.guestType.trim()) return 'Selecciona tu ocupación.'
    if (!form.legalAccepted) return 'Debes aceptar la Política de Privacidad y los Términos y Condiciones.'
    return ''
  }

  async function renderTicketBlob(record: GuestInvitationRecord) {
    const qrToken = readString(record.qr_token)
    const eventId = readString(record.event_id)

    if (!qrToken || !eventId) {
      throw new Error('La entrada no tiene token QR asociado.')
    }

    const qrPayload = buildAdminCheckInUrl(qrToken, eventId)
    const templatePath = readString(record.invitation_template_path)
    const templateBucket = readString(record.invitation_template_bucket) || INVITATION_TEMPLATE_BUCKET

    if (templatePath) {
      const { data, error } = await supabase.storage.from(templateBucket).createSignedUrl(templatePath, 60)

      if (!error && data?.signedUrl) {
        return renderInvitationPng({
          accessCode: readString(record.access_code),
          qrBox: readQrBox(record),
          qrPayload,
          templateUrl: data.signedUrl,
        })
      }
    }

    return renderFallbackTicketPng(record, qrPayload)
  }

  async function storeGuestTicket(record: GuestInvitationRecord) {
    const blob = await renderTicketBlob(record)
    const fileName = buildInvitationFileName({
      accessCode: record.access_code,
      firstName: record.first_name,
      fullName: getAttendeeName(record),
      lastName: record.last_name,
      qrToken: record.qr_token,
    })
    const storagePath = `guest-links/${record.invitation_token}/entrada.png`
    const qrPayload = buildAdminCheckInUrl(readString(record.qr_token), record.event_id)
    const qrBox = readQrBox(record)

    const { error: uploadError } = await supabase.storage.from(GENERATED_INVITATIONS_BUCKET).upload(storagePath, blob, {
      contentType: 'image/png',
      upsert: true,
    })

    if (uploadError) throw uploadError

    const { error: recordError } = await supabase.rpc('record_guest_generated_invitation', {
      p_file_name: fileName,
      p_invitation_token: record.invitation_token,
      p_path: storagePath,
      p_qr_height: qrBox.height,
      p_qr_payload: qrPayload,
      p_qr_width: qrBox.width,
      p_qr_x: qrBox.x,
      p_qr_y: qrBox.y,
      p_size_bytes: blob.size,
      p_template_bucket: readString(record.invitation_template_bucket) || INVITATION_TEMPLATE_BUCKET,
      p_template_path: readString(record.invitation_template_path),
    })

    if (recordError) throw recordError

    return { blob, fileName, path: storagePath }
  }

  async function handleGenerateTicket(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    resetMessages()

    if (!invitation) return

    const validationMessage = validateForm()

    if (validationMessage) {
      setErrorMessage(validationMessage)
      return
    }

    setIsGenerating(true)

    try {
      const { data, error } = await supabase.rpc('generate_guest_invitation', {
        p_accepted_privacy: form.legalAccepted,
        p_accepted_terms: form.legalAccepted,
        p_community_consent: form.communityConsent,
        p_email: form.email.trim(),
        p_first_name: form.firstName.trim(),
        p_guest_type: form.guestType.trim(),
        p_invitation_token: invitation.invitation_token,
        p_last_name: form.lastName.trim(),
        p_phone: form.phone.trim(),
        p_user_agent: navigator.userAgent,
      })

      if (error) throw error

      const result = Array.isArray(data) ? (data[0] as GenerateGuestInvitationResult | undefined) : null

      if (!result || (result.result !== 'generated' && result.result !== 'already_generated')) {
        throw new Error(readString(result?.message) || 'No pudimos generar la entrada.')
      }

      const nextRecord: GuestInvitationRecord = {
        ...invitation,
        accepted_privacy: true,
        accepted_terms: true,
        access_code: result.access_code ?? invitation.access_code,
        attendee_id: result.attendee_id ?? invitation.attendee_id,
        community_consent: form.communityConsent,
        email: form.email.trim(),
        event_id: result.event_id ?? invitation.event_id,
        first_name: form.firstName.trim(),
        full_name: buildAttendeeFullName(form.firstName.trim(), form.lastName.trim()),
        guest_type: form.guestType.trim(),
        last_name: form.lastName.trim(),
        phone: form.phone.trim(),
        qr_token: result.qr_token ?? invitation.qr_token,
        ticket_generated_at: result.ticket_generated_at ?? new Date().toISOString(),
        ticket_status: 'generated',
      }

      await storeGuestTicket(nextRecord)
      setMessage(readString(result.message) || 'Entrada generada correctamente.')
      await loadInvitation()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleDownloadTicket() {
    resetMessages()

    if (!invitation || !hasDownloadableTicket) return

    setIsDownloading(true)

    try {
      const latestPath = readString(invitation.latest_invitation_path)
      const latestBucket = readString(invitation.latest_invitation_bucket) || GENERATED_INVITATIONS_BUCKET

      if (latestPath) {
        const { data, error } = await supabase.storage.from(latestBucket).download(latestPath)

        if (!error && data) {
          downloadBlob(data, readString(invitation.latest_invitation_file_name) || 'entrada-onda.png')
          await supabase.rpc('mark_guest_invitation_downloaded', {
            p_invitation_token: invitation.invitation_token,
            p_path: latestPath,
          })

          setMessage('Entrada descargada.')
          await loadInvitation()
          return
        }
      }

      const { blob, fileName, path } = await storeGuestTicket(invitation)

      downloadBlob(blob, fileName)
      await supabase.rpc('mark_guest_invitation_downloaded', {
        p_invitation_token: invitation.invitation_token,
        p_path: path,
      })

      setMessage('Entrada descargada.')
      await loadInvitation()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsDownloading(false)
    }
  }

  if (isLoading) {
    return (
      <section className="dark grid min-h-[calc(100vh-5rem)] place-items-center bg-onda-night px-4 py-20 text-onda-soft">
        <div className="glass-panel flex min-h-40 w-full max-w-lg items-center justify-center rounded-lg bg-onda-black/72 p-8 text-sm font-semibold text-onda-muted">
          <Loader2 className="mr-3 h-5 w-5 animate-spin text-onda-lavender" aria-hidden="true" />
          Cargando invitación...
        </div>
      </section>
    )
  }

  if (!invitation) {
    return (
      <section className="dark bg-onda-night py-20 pb-28 text-onda-soft">
        <div className="onda-container">
          <StatePanel
            icon={<AlertTriangle className="h-8 w-8" aria-hidden="true" />}
            title="Link no disponible"
            description={errorMessage || 'No encontramos esta invitación. Revisa que el link esté completo o solicita uno nuevo al equipo ONDA.'}
          />
        </div>
      </section>
    )
  }

  const isBlockedStatus = ticketStatus === 'cancelled' || ticketStatus === 'expired'

  return (
    <section className="dark bg-onda-night py-10 pb-28 text-onda-soft sm:py-16">
      <div className="onda-container">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <section className="glass-panel rounded-lg bg-onda-black/72 p-5 shadow-[0_0_42px_rgba(123,44,255,0.18)] sm:p-7">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-onda-purple/18 text-onda-lavender">
                <Ticket className="h-7 w-7" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-xs font-bold uppercase tracking-[0.22em] text-onda-lavender">
                  Entrada ONDA
                </p>
                <h1 className="mt-3 font-display text-3xl font-extrabold uppercase tracking-[0.08em] text-white sm:text-4xl">
                  {eventTitle}
                </h1>
                <p className="mt-4 text-sm leading-7 text-onda-muted">
                  {readString(invitation.event_description) || 'Completa tus datos para activar tu entrada digital.'}
                </p>
              </div>
            </div>

            <dl className="mt-7 grid gap-3 rounded-lg border border-white/10 bg-white/5 p-4 text-sm">
              <div className="flex gap-3">
                <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-onda-lavender" aria-hidden="true" />
                <div>
                  <dt className="font-display text-[0.66rem] font-bold uppercase tracking-[0.14em] text-onda-muted">
                    Fecha
                  </dt>
                  <dd className="mt-1 font-semibold text-white">
                    {invitation.event_date ? formatEventDate(invitation.event_date) : 'Por confirmar'}
                  </dd>
                </div>
              </div>
              <div className="flex gap-3">
                <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-onda-lavender" aria-hidden="true" />
                <div>
                  <dt className="font-display text-[0.66rem] font-bold uppercase tracking-[0.14em] text-onda-muted">
                    Asistente
                  </dt>
                  <dd className="mt-1 font-semibold text-white">{attendeeName}</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-onda-lavender" aria-hidden="true" />
                <div>
                  <dt className="font-display text-[0.66rem] font-bold uppercase tracking-[0.14em] text-onda-muted">
                    Estado
                  </dt>
                  <dd className="mt-1 font-semibold text-white">{getTicketStatusLabel(ticketStatus)}</dd>
                </div>
              </div>
            </dl>

            {message ? (
              <p className="mt-5 rounded-md border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100">
                {message}
              </p>
            ) : null}

            {errorMessage ? (
              <p className="mt-5 rounded-md border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">
                {errorMessage}
              </p>
            ) : null}
          </section>

          {isBlockedStatus ? (
            <StatePanel
              icon={<AlertTriangle className="h-8 w-8" aria-hidden="true" />}
              title={getTicketStatusLabel(ticketStatus)}
              description="Este link ya no permite generar una entrada. Si crees que es un error, contacta al equipo ONDA."
            />
          ) : hasDownloadableTicket ? (
            <section className="glass-panel rounded-lg bg-onda-black/72 p-5 shadow-[0_0_42px_rgba(123,44,255,0.18)] sm:p-7">
              <div className="flex items-start gap-4">
                <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-emerald-500/14 text-emerald-200">
                  <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-display text-2xl font-extrabold uppercase tracking-[0.1em] text-white">
                    {ticketStatus === 'used' ? 'Entrada utilizada' : 'Tu entrada está lista'}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-onda-muted">
                    {ticketStatus === 'used'
                      ? `Validada el ${formatDateTime(invitation.checked_in_at)}.`
                      : 'Puedes descargarla nuevamente cuando lo necesites.'}
                  </p>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-lg border border-onda-purple/24 bg-black p-3">
                {previewImageUrl ? (
                  <img src={previewImageUrl} alt="Entrada digital ONDA" className="mx-auto max-h-[34rem] rounded-md object-contain" />
                ) : qrPreviewDataUrl ? (
                  <div className="grid justify-items-center gap-4 p-6 text-center">
                    <img src={qrPreviewDataUrl} alt="Código QR de entrada" className="h-64 w-64 rounded-md bg-white p-3" />
                    <p className="font-display text-sm font-bold uppercase tracking-[0.14em] text-white">
                      {readString(invitation.access_code) ? `Código: ${invitation.access_code}` : 'Código QR'}
                    </p>
                  </div>
                ) : (
                  <div className="grid min-h-64 place-items-center text-sm font-semibold text-onda-muted">
                    Preparando vista de entrada...
                  </div>
                )}
              </div>

              <CTAButton
                type="button"
                variant="primary"
                className="mt-6 min-h-14 w-full"
                icon={isDownloading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Download className="h-5 w-5" aria-hidden="true" />}
                onClick={() => void handleDownloadTicket()}
                disabled={isDownloading}
              >
                {isDownloading ? 'Descargando...' : 'Descargar entrada'}
              </CTAButton>
            </section>
          ) : (
            <form className="glass-panel grid gap-5 rounded-lg bg-onda-black/72 p-5 shadow-[0_0_42px_rgba(123,44,255,0.18)] sm:p-7" onSubmit={handleGenerateTicket}>
              <div>
                <p className="font-display text-xs font-bold uppercase tracking-[0.22em] text-onda-lavender">
                  Datos del asistente
                </p>
                <h2 className="mt-3 font-display text-2xl font-extrabold uppercase tracking-[0.1em] text-white">
                  Genera tu entrada
                </h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClassName}>
                  Nombre
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(inputEvent) => setForm((current) => ({ ...current, firstName: inputEvent.target.value }))}
                    className={inputClassName}
                    autoComplete="given-name"
                    required
                  />
                </label>
                <label className={labelClassName}>
                  Apellido
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(inputEvent) => setForm((current) => ({ ...current, lastName: inputEvent.target.value }))}
                    className={inputClassName}
                    autoComplete="family-name"
                    required
                  />
                </label>
              </div>

              <label className={labelClassName}>
                Correo electrónico
                <input
                  type="email"
                  value={form.email}
                  onChange={(inputEvent) => setForm((current) => ({ ...current, email: inputEvent.target.value }))}
                  className={inputClassName}
                  autoComplete="email"
                  required
                />
              </label>

              <label className={labelClassName}>
                Teléfono
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(inputEvent) => setForm((current) => ({ ...current, phone: inputEvent.target.value }))}
                  className={inputClassName}
                  autoComplete="tel"
                  required
                />
              </label>

              <label className={labelClassName}>
                Ocupación
                <select
                  value={form.guestType}
                  onChange={(inputEvent) => setForm((current) => ({ ...current, guestType: inputEvent.target.value }))}
                  className={cn(inputClassName, 'appearance-none')}
                  required
                >
                  <option value="">Selecciona una opción</option>
                  {guestTypeOptions.map((option) => (
                    <option key={option} value={option} className="bg-onda-black text-white">
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 rounded-lg border border-onda-purple/20 bg-white/5 p-4">
                <label className="flex items-start gap-3 text-sm leading-6 text-onda-muted">
                  <input
                    type="checkbox"
                    checked={form.legalAccepted}
                    onChange={(inputEvent) => setForm((current) => ({ ...current, legalAccepted: inputEvent.target.checked }))}
                    className="mt-1 h-5 w-5 shrink-0 accent-onda-purple"
                    required
                  />
                  <span>
                    Declaro haber leído y acepto la{' '}
                    <Link to="/politicas-de-privacidad" className="font-semibold text-onda-lavender underline-offset-4 hover:underline">
                      Política de Privacidad
                    </Link>{' '}
                    y los{' '}
                    <Link to="/terminos-y-condiciones" className="font-semibold text-onda-lavender underline-offset-4 hover:underline">
                      Términos y Condiciones
                    </Link>{' '}
                    de ONDA Multimedia.
                  </span>
                </label>

                <label className="flex items-start gap-3 text-sm leading-6 text-onda-muted">
                  <input
                    type="checkbox"
                    checked={form.communityConsent}
                    onChange={(inputEvent) => setForm((current) => ({ ...current, communityConsent: inputEvent.target.checked }))}
                    className="mt-1 h-5 w-5 shrink-0 accent-onda-purple"
                  />
                  <span>Acepto recibir invitaciones, novedades y comunicaciones de la Comunidad ONDA.</span>
                </label>
              </div>

              <CTAButton
                type="submit"
                variant="primary"
                className="min-h-14 w-full"
                icon={isGenerating ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <QrCode className="h-5 w-5" aria-hidden="true" />}
                disabled={isGenerating || !form.legalAccepted}
              >
                {isGenerating ? 'Generando...' : 'Generar mi entrada'}
              </CTAButton>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}

function StatePanel({
  description,
  icon,
  title,
}: {
  description: string
  icon: ReactNode
  title: string
}) {
  return (
    <section className="glass-panel rounded-lg bg-onda-black/72 p-5 text-center shadow-[0_0_42px_rgba(123,44,255,0.18)] sm:p-8">
      <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-md bg-onda-purple/16 text-onda-lavender">
        {icon}
      </div>
      <h1 className="mt-5 font-display text-2xl font-extrabold uppercase tracking-[0.1em] text-white">{title}</h1>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-onda-muted">{description}</p>
    </section>
  )
}
