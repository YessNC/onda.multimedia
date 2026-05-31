import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, CheckCircle2, Keyboard, Loader2, QrCode, XCircle } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import AdminSignOutButton from '../components/admin/AdminSignOutButton'
import QRScanner from '../components/admin/QRScanner'
import CTAButton from '../components/shared/CTAButton'
import SectionTitle from '../components/shared/SectionTitle'
import { isUuid, normalizeAccessCode } from '../lib/accessCodes'
import { parseCheckInQrPayload } from '../lib/checkInQr'
import { type EventRecord, getEventTitle, readString } from '../lib/events'
import { supabase } from '../lib/supabaseClient'

type EventAttendee = Record<string, unknown> & {
  access_code?: string | null
  accepted_privacy?: boolean | null
  accepted_terms?: boolean | null
  check_in_status?: string | null
  checked_in_at?: string | null
  email?: string | null
  event_id?: string | null
  first_name?: string | null
  full_name?: string | null
  id: string
  last_name?: string | null
  qr_token?: string | null
  ticket_status?: string | null
}

type CheckInResultKind = 'already_used' | 'cancelled' | 'checked_in' | 'error' | 'not_found' | 'pending' | 'wrong_event'

type CheckInResult = {
  attendeeId?: string | null
  attendeeName?: string | null
  checkedInAt?: string | null
  eventId?: string | null
  eventName?: string | null
  message: string
  result: CheckInResultKind
  token?: string | null
  validatedAt?: string | null
}

const resultStyles: Record<CheckInResultKind, string> = {
  already_used: 'border-amber-400/40 bg-amber-500/12 text-amber-50 shadow-[0_0_42px_rgba(245,158,11,0.14)]',
  cancelled: 'border-red-400/40 bg-red-500/12 text-red-50 shadow-[0_0_42px_rgba(239,68,68,0.13)]',
  checked_in: 'border-emerald-400/40 bg-emerald-500/12 text-emerald-50 shadow-[0_0_42px_rgba(16,185,129,0.14)]',
  error: 'border-red-400/40 bg-red-500/12 text-red-50 shadow-[0_0_42px_rgba(239,68,68,0.13)]',
  not_found: 'border-red-400/40 bg-red-500/12 text-red-50 shadow-[0_0_42px_rgba(239,68,68,0.13)]',
  pending: 'border-amber-400/40 bg-amber-500/12 text-amber-50 shadow-[0_0_42px_rgba(245,158,11,0.14)]',
  wrong_event: 'border-red-400/40 bg-red-500/12 text-red-50 shadow-[0_0_42px_rgba(239,68,68,0.13)]',
}

const resultTitles: Record<CheckInResultKind, string> = {
  already_used: 'Entrada ya utilizada',
  cancelled: 'Entrada cancelada',
  checked_in: 'Entrada valida',
  error: 'No pudimos validar',
  not_found: 'Entrada no encontrada',
  pending: 'Entrada pendiente',
  wrong_event: 'Entrada pertenece a otro evento',
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Ocurrio un error inesperado.'
}

function getAttendeeName(attendee: EventAttendee | null) {
  if (!attendee) return ''

  return (
    readString(attendee.full_name) ||
    `${readString(attendee.first_name)} ${readString(attendee.last_name)}`.trim() ||
    readString(attendee.email) ||
    'Asistente'
  )
}

function getResultIcon(result: CheckInResultKind) {
  if (result === 'checked_in') return CheckCircle2
  if (result === 'already_used' || result === 'pending') return AlertTriangle
  return XCircle
}

function normalizeResultKind(value: string): CheckInResultKind | '' {
  if (value === 'valid') return 'checked_in'
  if (value === 'already_checked_in') return 'already_used'
  if (
    value === 'already_used' ||
    value === 'cancelled' ||
    value === 'checked_in' ||
    value === 'error' ||
    value === 'not_found' ||
    value === 'pending' ||
    value === 'wrong_event'
  ) {
    return value
  }

  return ''
}

function normalizeRpcResult(data: unknown): CheckInResult | null {
  const row = Array.isArray(data) ? data[0] : data

  if (!row || typeof row !== 'object') return null

  const record = row as Record<string, unknown>
  const result = normalizeResultKind(readString(record.result))
  const message = readString(record.message)

  if (!result || !message) return null

  return {
    attendeeId: readString(record.attendee_id) || null,
    attendeeName: readString(record.attendee_name) || null,
    checkedInAt: readString(record.checked_in_at) || null,
    eventId: readString(record.event_id) || null,
    eventName: readString(record.event_name) || readString(record.event_title) || null,
    message,
    result,
  }
}

function formatDateTime(value?: string | null) {
  const date = value ? new Date(value) : new Date()

  if (Number.isNaN(date.getTime())) return value || ''

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

async function writeCheckInLog({
  attendeeId,
  eventId,
  message,
  result,
  scannedBy,
  token,
}: {
  attendeeId?: string | null
  eventId?: string | null
  message: string
  result: CheckInResultKind
  scannedBy?: string | null
  token: string
}) {
  const { error } = await supabase.from('check_in_logs').insert({
    attendee_id: attendeeId || null,
    event_id: eventId || null,
    message,
    result,
    scanned_by: scannedBy || null,
    token_scanned: token,
  })

  if (error) {
    console.warn('No pudimos registrar check-in log:', error.message)
  }
}

async function getEventName(eventId: string) {
  if (!eventId) return ''

  const { data, error } = await supabase.from('events').select('*').eq('id', eventId).maybeSingle()

  if (error || !data) return ''

  return getEventTitle(data as EventRecord)
}

async function enrichCheckInResult(result: CheckInResult): Promise<CheckInResult> {
  const enriched: CheckInResult = {
    ...result,
    validatedAt: result.validatedAt || new Date().toISOString(),
  }
  let eventId = readString(enriched.eventId)

  if (enriched.attendeeId) {
    const { data, error } = await supabase
      .from('event_attendees')
      .select('id, event_id, first_name, last_name, full_name, email, checked_in_at')
      .eq('id', enriched.attendeeId)
      .maybeSingle()

    if (!error && data) {
      const attendee = data as EventAttendee
      const attendeeEventId = readString(attendee.event_id)

      enriched.attendeeName = enriched.attendeeName || getAttendeeName(attendee)
      enriched.checkedInAt = enriched.checkedInAt || readString(attendee.checked_in_at) || null
      eventId = enriched.result === 'wrong_event' ? attendeeEventId || eventId : eventId || attendeeEventId
      enriched.eventId = eventId || enriched.eventId
    }
  }

  if (eventId && !enriched.eventName) {
    enriched.eventName = await getEventName(eventId)
  }

  return enriched
}

async function validateLocally(input: string, targetEventId: string): Promise<CheckInResult> {
  const entryInput = input.trim()
  const searchByToken = isUuid(entryInput)
  const accessCode = normalizeAccessCode(entryInput)
  const scannedValue = searchByToken ? entryInput : accessCode
  const { data: userData } = await supabase.auth.getUser()
  const scannedBy = userData.user?.id ?? null
  let attendeeQuery = supabase.from('event_attendees').select('*')

  if (searchByToken) {
    attendeeQuery = attendeeQuery.eq('qr_token', entryInput)
  } else {
    attendeeQuery = attendeeQuery.eq('access_code', accessCode)

    if (targetEventId) {
      attendeeQuery = attendeeQuery.eq('event_id', targetEventId)
    }
  }

  const { data, error } = await attendeeQuery.maybeSingle()

  if (error) throw error

  let attendee = data as EventAttendee | null

  if (!attendee && !searchByToken && targetEventId) {
    const { data: wrongEventData, error: wrongEventError } = await supabase
      .from('event_attendees')
      .select('*')
      .eq('access_code', accessCode)
      .limit(1)
      .maybeSingle()

    if (wrongEventError) throw wrongEventError

    attendee = wrongEventData as EventAttendee | null
  }

  if (!attendee) {
    const result: CheckInResult = {
      eventId: targetEventId || null,
      message: 'Entrada no encontrada.',
      result: 'not_found',
      token: scannedValue,
    }

    await writeCheckInLog({
      eventId: targetEventId || null,
      message: result.message,
      result: result.result,
      scannedBy,
      token: scannedValue,
    })

    return result
  }

  const attendeeEventId = readString(attendee.event_id)

  if (targetEventId && attendeeEventId !== targetEventId) {
    const result: CheckInResult = {
      attendeeId: attendee.id,
      attendeeName: getAttendeeName(attendee),
      eventId: attendeeEventId || targetEventId,
      message: 'Esta entrada pertenece a otro evento.',
      result: 'wrong_event',
      token: scannedValue,
    }

    await writeCheckInLog({
      attendeeId: attendee.id,
      eventId: targetEventId,
      message: result.message,
      result: result.result,
      scannedBy,
      token: scannedValue,
    })

    return result
  }

  const checkInStatus = readString(attendee.check_in_status)
  const rawTicketStatus = readString(attendee.ticket_status)
  const isCheckedIn = checkInStatus === 'checked_in' || Boolean(readString(attendee.checked_in_at))
  const ticketStatus = rawTicketStatus === 'used' && !isCheckedIn ? 'generated' : rawTicketStatus || 'pending'

  if (checkInStatus === 'cancelled' || rawTicketStatus === 'cancelled') {
    const result: CheckInResult = {
      attendeeId: attendee.id,
      attendeeName: getAttendeeName(attendee),
      eventId: attendeeEventId || targetEventId || null,
      message: 'Entrada cancelada.',
      result: 'cancelled',
      token: scannedValue,
    }

    await writeCheckInLog({
      attendeeId: attendee.id,
      eventId: result.eventId,
      message: result.message,
      result: result.result,
      scannedBy,
      token: scannedValue,
    })

    return result
  }

  if (isCheckedIn) {
    const result: CheckInResult = {
      attendeeId: attendee.id,
      attendeeName: getAttendeeName(attendee),
      checkedInAt: readString(attendee.checked_in_at) || null,
      eventId: attendeeEventId || targetEventId || null,
      message: 'Entrada ya utilizada.',
      result: 'already_used',
      token: scannedValue,
    }

    await writeCheckInLog({
      attendeeId: attendee.id,
      eventId: result.eventId,
      message: result.message,
      result: result.result,
      scannedBy,
      token: scannedValue,
    })

    return result
  }

  if (ticketStatus !== 'generated' || !attendee.accepted_privacy || !attendee.accepted_terms) {
    const result: CheckInResult = {
      attendeeId: attendee.id,
      attendeeName: getAttendeeName(attendee),
      eventId: attendeeEventId || targetEventId || null,
      message: 'Entrada pendiente de generacion o consentimiento legal.',
      result: 'pending',
      token: scannedValue,
    }

    await writeCheckInLog({
      attendeeId: attendee.id,
      eventId: result.eventId,
      message: result.message,
      result: result.result,
      scannedBy,
      token: scannedValue,
    })

    return result
  }

  const checkedInAt = new Date().toISOString()
  const { error: updateError } = await supabase
    .from('event_attendees')
    .update({
      check_in_status: 'checked_in',
      checked_in_at: checkedInAt,
      checked_in_by: scannedBy,
    })
    .eq('id', attendee.id)

  if (updateError) throw updateError

  const result: CheckInResult = {
    attendeeId: attendee.id,
    attendeeName: getAttendeeName(attendee),
    checkedInAt,
    eventId: attendeeEventId || targetEventId || null,
    message: `${getAttendeeName(attendee)} validado correctamente.`,
    result: 'checked_in',
    token: scannedValue,
  }

  await writeCheckInLog({
    attendeeId: attendee.id,
    eventId: result.eventId,
    message: result.message,
    result: result.result,
    scannedBy,
    token: scannedValue,
  })

  return result
}

function CheckInResultCard({
  onManual,
  onScanAnother,
  result,
}: {
  onManual: () => void
  onScanAnother: () => void
  result: CheckInResult
}) {
  const Icon = getResultIcon(result.result)
  const validatedAt = result.validatedAt || result.checkedInAt || new Date().toISOString()

  return (
    <section className={`rounded-lg border p-5 sm:p-7 ${resultStyles[result.result]}`} role="status">
      <div className="grid gap-5">
        <div className="flex items-start gap-4">
          <div className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-white/20 bg-white/10">
            <Icon className="h-8 w-8" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-xs font-bold uppercase tracking-[0.16em] opacity-80">Resultado</p>
            <h2 className="mt-2 font-display text-2xl font-extrabold uppercase tracking-[0.08em] text-white sm:text-3xl">
              {resultTitles[result.result]}
            </h2>
            <p className="mt-3 text-base font-semibold leading-7">{result.message}</p>
          </div>
        </div>

        <dl className="grid gap-3 rounded-lg border border-white/12 bg-black/20 p-4 text-sm sm:grid-cols-3">
          <div className="min-w-0">
            <dt className="font-display text-[0.64rem] font-bold uppercase tracking-[0.14em] opacity-70">Asistente</dt>
            <dd className="mt-2 break-words font-semibold text-white">{result.attendeeName || 'No disponible'}</dd>
          </div>
          <div className="min-w-0">
            <dt className="font-display text-[0.64rem] font-bold uppercase tracking-[0.14em] opacity-70">Evento</dt>
            <dd className="mt-2 break-words font-semibold text-white">{result.eventName || result.eventId || 'No disponible'}</dd>
          </div>
          <div className="min-w-0">
            <dt className="font-display text-[0.64rem] font-bold uppercase tracking-[0.14em] opacity-70">
              Hora de validacion
            </dt>
            <dd className="mt-2 break-words font-semibold text-white">{formatDateTime(validatedAt)}</dd>
          </div>
        </dl>

        <div className="grid gap-3 sm:grid-cols-2">
          <CTAButton
            type="button"
            variant="primary"
            className="w-full min-h-14"
            icon={<QrCode className="h-5 w-5" aria-hidden="true" />}
            onClick={onScanAnother}
          >
            Escanear otra entrada
          </CTAButton>
          <CTAButton
            type="button"
            variant="secondary"
            className="w-full min-h-14"
            icon={<Keyboard className="h-5 w-5" aria-hidden="true" />}
            onClick={onManual}
          >
            Validar manualmente
          </CTAButton>
        </div>
      </div>
    </section>
  )
}

export default function AdminCheckIn() {
  const [searchParams] = useSearchParams()
  const eventId = searchParams.get('eventId')?.trim() || ''
  const tokenParam = searchParams.get('token')?.trim() || ''
  const [eventRecord, setEventRecord] = useState<EventRecord | null>(null)
  const [eventErrorMessage, setEventErrorMessage] = useState('')
  const [isLoadingEvent, setIsLoadingEvent] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [qrInput, setQrInput] = useState(tokenParam)
  const [result, setResult] = useState<CheckInResult | null>(null)
  const [scannerStartSignal, setScannerStartSignal] = useState(0)
  const activeValidationSignatureRef = useRef('')
  const manualInputRef = useRef<HTMLTextAreaElement | null>(null)

  const eventTitle = useMemo(() => (eventRecord ? getEventTitle(eventRecord) : ''), [eventRecord])

  useEffect(() => {
    setQrInput(tokenParam)
  }, [tokenParam])

  useEffect(() => {
    let isMounted = true

    async function loadEvent() {
      setEventRecord(null)
      setEventErrorMessage('')

      if (!eventId) return

      setIsLoadingEvent(true)

      const { data, error } = await supabase.from('events').select('*').eq('id', eventId).maybeSingle()

      if (!isMounted) return

      if (error) {
        setEventErrorMessage(error.message)
        setIsLoadingEvent(false)
        return
      }

      setEventRecord((data as EventRecord | null) ?? null)
      setIsLoadingEvent(false)
    }

    void loadEvent()

    return () => {
      isMounted = false
    }
  }, [eventId])

  const validateEntry = useCallback(async (input: string, targetEventId: string) => {
    if (targetEventId) {
      const { data, error } = await supabase.rpc('validate_attendee_entry_for_event', {
        p_event_id: targetEventId,
        p_input: input,
      })

      if (!error) {
        const rpcResult = normalizeRpcResult(data)

        if (rpcResult) return rpcResult
      } else {
        console.warn('validate_attendee_entry_for_event no disponible o fallo:', error.message)
      }

      if (isUuid(input)) {
        const { data: qrData, error: qrError } = await supabase.rpc('validate_attendee_qr_for_event', {
          p_event_id: targetEventId,
          p_qr_token: input,
        })

        if (!qrError) {
          const rpcResult = normalizeRpcResult(qrData)

          if (rpcResult) return rpcResult
        } else {
          console.warn('validate_attendee_qr_for_event no disponible o fallo:', qrError.message)
        }
      }
    }

    // TODO: retirar este fallback cuando validate_attendee_entry_for_event este desplegada en produccion.
    return validateLocally(input, targetEventId)
  }, [])

  const validateQrValue = useCallback(
    async (rawValue: string, source: 'manual' | 'scanner') => {
      const parsedQr = parseCheckInQrPayload(rawValue)
      const entryInput = parsedQr.token || parsedQr.accessCode
      const isAccessCodeInput = Boolean(parsedQr.accessCode && !parsedQr.token)
      const qrEventId = parsedQr.eventId
      const targetEventId = eventId || qrEventId
      const validationSignature = `${targetEventId || 'general'}:${entryInput}`

      if (source === 'scanner') {
        setQrInput(rawValue.trim())
      }

      setResult(null)

      if (!entryInput) {
        setResult({
          message: 'Ingresa o escanea un codigo QR.',
          result: 'error',
          validatedAt: new Date().toISOString(),
        })
        return
      }

      if (isAccessCodeInput && !targetEventId) {
        setResult({
          message: 'Para validar con codigo corto, abre el check-in desde un evento seleccionado.',
          result: 'error',
          token: entryInput,
          validatedAt: new Date().toISOString(),
        })
        return
      }

      if (source === 'scanner' && activeValidationSignatureRef.current === validationSignature) return

      if (qrEventId && eventId && qrEventId !== eventId) {
        activeValidationSignatureRef.current = ''
        setIsValidating(false)
        setResult(
          await enrichCheckInResult({
            eventId: qrEventId,
            message: 'Esta entrada pertenece a otro evento.',
            result: 'wrong_event',
            token: entryInput,
            validatedAt: new Date().toISOString(),
          }),
        )
        return
      }

      activeValidationSignatureRef.current = validationSignature
      setIsValidating(true)

      try {
        const validationResult = await validateEntry(entryInput, targetEventId)
        const enrichedResult = await enrichCheckInResult({
          ...validationResult,
          token: entryInput,
          validatedAt: new Date().toISOString(),
        })

        setQrInput(entryInput)
        setResult(enrichedResult)
      } catch (error) {
        setResult({
          message: getErrorMessage(error),
          result: 'error',
          token: entryInput,
          validatedAt: new Date().toISOString(),
        })
      } finally {
        setIsValidating(false)
        activeValidationSignatureRef.current = ''
      }
    },
    [eventId, validateEntry],
  )

  function handleManualValidate() {
    void validateQrValue(qrInput, 'manual')
  }

  function handleScanAnother() {
    setResult(null)
    setQrInput('')
    activeValidationSignatureRef.current = ''
    setScannerStartSignal((current) => current + 1)
  }

  function handleManualFocus() {
    setResult(null)
    window.setTimeout(() => manualInputRef.current?.focus(), 0)
  }

  return (
    <section className="dark min-h-[calc(100vh-5rem)] bg-onda-night py-10 pb-28 text-onda-soft sm:py-16">
      <div className="onda-container">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
          <SectionTitle
            eyebrow="Admin"
            title="Registro de entrada"
            subtitle="Validacion de entradas por QR asociada al evento seleccionado."
          />
          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <CTAButton
              to="/admin/eventos"
              variant="secondary"
              icon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
            >
              Volver a eventos
            </CTAButton>
            <AdminSignOutButton />
          </div>
        </div>

        <div className="mt-8 grid gap-6">
          <section className="glass-panel grid gap-4 rounded-lg bg-onda-black/72 p-5 shadow-[0_0_34px_rgba(123,44,255,0.18)] sm:p-6">
            <div className="flex items-start gap-4">
              <div className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-onda-purple/16 text-onda-lavender">
                <QrCode className="h-7 w-7" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-xl font-extrabold uppercase tracking-[0.14em] text-white">
                  {eventId ? 'Evento seleccionado' : 'Check-in general'}
                </h2>
                <p className="mt-3 text-sm leading-7 text-onda-muted">
                  {isLoadingEvent
                    ? 'Cargando evento...'
                    : eventTitle || 'Abre esta pantalla desde el boton Validar entradas de un evento para fijar eventId.'}
                </p>
                {eventId ? <p className="mt-2 break-all text-xs font-semibold text-onda-muted/80">ID: {eventId}</p> : null}
              </div>
            </div>

            {eventErrorMessage ? (
              <p className="rounded-md border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">
                {eventErrorMessage}
              </p>
            ) : null}

            {eventId && !isLoadingEvent && !eventRecord && !eventErrorMessage ? (
              <p className="rounded-md border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-100">
                No encontramos el evento seleccionado.
              </p>
            ) : null}
          </section>

          <div className="grid min-w-0 gap-6 xl:grid-cols-[1.04fr_0.96fr] xl:items-start">
            <div className="grid min-w-0 gap-6">
              <QRScanner disabled={isValidating} onScan={(value) => void validateQrValue(value, 'scanner')} startSignal={scannerStartSignal} />

              {isValidating ? (
                <div className="rounded-lg border border-onda-purple/30 bg-onda-purple/12 p-5 text-sm font-semibold text-onda-soft">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-onda-lavender" aria-hidden="true" />
                    Validando entrada...
                  </div>
                </div>
              ) : null}

              {result ? <CheckInResultCard result={result} onManual={handleManualFocus} onScanAnother={handleScanAnother} /> : null}
            </div>

            <section className="glass-panel grid min-w-0 gap-5 rounded-lg bg-onda-black/72 p-5 shadow-[0_0_34px_rgba(123,44,255,0.18)] sm:p-6">
              <div className="flex items-start gap-3">
                <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-white/8 text-onda-lavender">
                  <Keyboard className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-display text-lg font-extrabold uppercase tracking-[0.13em] text-white">
                    QR, token o codigo
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-onda-muted">
                    Respaldo manual para pegar un codigo corto, token puro o URL completa del QR.
                  </p>
                </div>
              </div>

              <label className="grid gap-2 text-sm font-semibold text-onda-soft">
                Codigo, token o URL
                <textarea
                  ref={manualInputRef}
                  rows={5}
                  value={qrInput}
                  onChange={(inputEvent) => setQrInput(inputEvent.target.value)}
                  className="min-h-36 w-full resize-y rounded-md border border-onda-purple/25 bg-white/5 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-onda-muted/70 focus:border-onda-purple"
                  placeholder="Pega el codigo corto, token o la URL del QR"
                  disabled={isValidating}
                />
              </label>

              <CTAButton
                type="button"
                variant="primary"
                className="w-full min-h-14"
                icon={
                  isValidating ? (
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  ) : (
                    <QrCode className="h-5 w-5" aria-hidden="true" />
                  )
                }
                onClick={handleManualValidate}
                disabled={isValidating}
              >
                {isValidating ? 'Validando...' : 'Validar entrada'}
              </CTAButton>
            </section>
          </div>
        </div>
      </div>
    </section>
  )
}
