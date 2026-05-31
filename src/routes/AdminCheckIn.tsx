import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, QrCode, XCircle } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import AdminSignOutButton from '../components/admin/AdminSignOutButton'
import CTAButton from '../components/shared/CTAButton'
import SectionTitle from '../components/shared/SectionTitle'
import { type EventRecord, getEventTitle, readString } from '../lib/events'
import { supabase } from '../lib/supabaseClient'

type EventAttendee = Record<string, unknown> & {
  check_in_status?: string | null
  checked_in_at?: string | null
  event_id?: string | null
  first_name?: string | null
  full_name?: string | null
  id: string
  last_name?: string | null
  qr_token?: string | null
}

type CheckInResult = {
  attendeeId?: string | null
  eventId?: string | null
  message: string
  result: 'already_used' | 'cancelled' | 'checked_in' | 'error' | 'not_found' | 'wrong_event'
}

const resultStyles: Record<CheckInResult['result'], string> = {
  already_used: 'border-amber-400/35 bg-amber-500/10 text-amber-100',
  cancelled: 'border-red-400/35 bg-red-500/10 text-red-100',
  checked_in: 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100',
  error: 'border-red-400/35 bg-red-500/10 text-red-100',
  not_found: 'border-red-400/35 bg-red-500/10 text-red-100',
  wrong_event: 'border-red-400/35 bg-red-500/10 text-red-100',
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
    'Asistente'
  )
}

function normalizeScannedToken(value: string) {
  const trimmed = value.trim()

  if (!trimmed) return ''

  try {
    const url = new URL(trimmed, window.location.origin)
    return (
      url.searchParams.get('token')?.trim() ||
      url.searchParams.get('qr_token')?.trim() ||
      url.searchParams.get('qrToken')?.trim() ||
      trimmed
    )
  } catch {
    return trimmed
  }
}

function normalizeRpcResult(data: unknown): CheckInResult | null {
  const row = Array.isArray(data) ? data[0] : data

  if (!row || typeof row !== 'object') return null

  const record = row as Record<string, unknown>
  const result = readString(record.result) as CheckInResult['result']
  const message = readString(record.message)

  if (!result || !message) return null

  return {
    attendeeId: readString(record.attendee_id) || null,
    eventId: readString(record.event_id) || null,
    message,
    result,
  }
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
  result: CheckInResult['result']
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

async function validateLocally(token: string, targetEventId: string): Promise<CheckInResult> {
  const { data: userData } = await supabase.auth.getUser()
  const scannedBy = userData.user?.id ?? null
  const { data, error } = await supabase
    .from('event_attendees')
    .select('*')
    .eq('qr_token', token)
    .maybeSingle()

  if (error) throw error

  const attendee = data as EventAttendee | null

  if (!attendee) {
    const result: CheckInResult = {
      eventId: targetEventId || null,
      message: 'Entrada no encontrada.',
      result: 'not_found',
    }

    await writeCheckInLog({
      eventId: targetEventId || null,
      message: result.message,
      result: result.result,
      scannedBy,
      token,
    })

    return result
  }

  const attendeeEventId = readString(attendee.event_id)

  if (targetEventId && attendeeEventId !== targetEventId) {
    const result: CheckInResult = {
      attendeeId: attendee.id,
      eventId: targetEventId,
      message: 'Esta entrada pertenece a otro evento.',
      result: 'wrong_event',
    }

    await writeCheckInLog({
      attendeeId: attendee.id,
      eventId: targetEventId,
      message: result.message,
      result: result.result,
      scannedBy,
      token,
    })

    return result
  }

  const checkInStatus = readString(attendee.check_in_status)

  if (checkInStatus === 'cancelled') {
    const result: CheckInResult = {
      attendeeId: attendee.id,
      eventId: attendeeEventId || targetEventId || null,
      message: 'Entrada cancelada.',
      result: 'cancelled',
    }

    await writeCheckInLog({
      attendeeId: attendee.id,
      eventId: result.eventId,
      message: result.message,
      result: result.result,
      scannedBy,
      token,
    })

    return result
  }

  if (checkInStatus === 'checked_in' || readString(attendee.checked_in_at)) {
    const result: CheckInResult = {
      attendeeId: attendee.id,
      eventId: attendeeEventId || targetEventId || null,
      message: 'Entrada ya utilizada.',
      result: 'already_used',
    }

    await writeCheckInLog({
      attendeeId: attendee.id,
      eventId: result.eventId,
      message: result.message,
      result: result.result,
      scannedBy,
      token,
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
    eventId: attendeeEventId || targetEventId || null,
    message: `${getAttendeeName(attendee)} validado correctamente.`,
    result: 'checked_in',
  }

  await writeCheckInLog({
    attendeeId: attendee.id,
    eventId: result.eventId,
    message: result.message,
    result: result.result,
    scannedBy,
    token,
  })

  return result
}

export default function AdminCheckIn() {
  const [searchParams] = useSearchParams()
  const eventId = searchParams.get('eventId')?.trim() || ''
  const tokenParam = searchParams.get('token')?.trim() || ''
  const [eventRecord, setEventRecord] = useState<EventRecord | null>(null)
  const [eventErrorMessage, setEventErrorMessage] = useState('')
  const [isLoadingEvent, setIsLoadingEvent] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [qrInputState, setQrInputState] = useState({ sourceToken: tokenParam, value: tokenParam })
  const [result, setResult] = useState<CheckInResult | null>(null)

  const eventTitle = useMemo(() => (eventRecord ? getEventTitle(eventRecord) : ''), [eventRecord])
  const qrInput = qrInputState.sourceToken === tokenParam ? qrInputState.value : tokenParam

  function updateQrInput(value: string) {
    setQrInputState({ sourceToken: tokenParam, value })
  }

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

  const validateToken = useCallback(
    async (token: string) => {
      if (eventId) {
        const { data, error } = await supabase.rpc('validate_attendee_qr_for_event', {
          p_event_id: eventId,
          p_qr_token: token,
        })

        if (!error) {
          const rpcResult = normalizeRpcResult(data)

          if (rpcResult) return rpcResult
        }
      }

      return validateLocally(token, eventId)
    },
    [eventId],
  )

  async function handleValidate() {
    const token = normalizeScannedToken(qrInput)

    setResult(null)

    if (!token) {
      setResult({
        message: 'Ingresa o escanea un codigo QR.',
        result: 'error',
      })
      return
    }

    setIsValidating(true)

    try {
      const validationResult = await validateToken(token)

      updateQrInput(token)
      setResult(validationResult)
    } catch (error) {
      setResult({
        message: getErrorMessage(error),
        result: 'error',
      })
    } finally {
      setIsValidating(false)
    }
  }

  return (
    <section className="dark min-h-[calc(100vh-5rem)] bg-onda-night py-16 text-onda-soft sm:py-20">
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

        <div className="mt-10 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="glass-panel grid content-start gap-4 rounded-lg bg-onda-black/72 p-6 shadow-[0_0_34px_rgba(123,44,255,0.18)]">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-md bg-onda-purple/16 text-onda-lavender">
              <QrCode className="h-7 w-7" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-display text-xl font-extrabold uppercase tracking-[0.14em] text-white">
                {eventId ? 'Evento seleccionado' : 'Check-in general'}
              </h3>
              <p className="mt-3 text-sm leading-7 text-onda-muted">
                {isLoadingEvent
                  ? 'Cargando evento...'
                  : eventTitle || 'Abre esta pantalla desde el boton Validar de un evento para fijar eventId.'}
              </p>
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
          </div>

          <div className="glass-panel grid gap-5 rounded-lg bg-onda-black/72 p-6 shadow-[0_0_34px_rgba(123,44,255,0.18)]">
            <label className="grid gap-2 text-sm font-semibold text-onda-soft">
              QR o token
              <textarea
                rows={4}
                value={qrInput}
                onChange={(inputEvent) => updateQrInput(inputEvent.target.value)}
                className="rounded-md border border-onda-purple/25 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-onda-muted/70 focus:border-onda-purple"
                placeholder="Pega el token o la URL del QR"
                disabled={isValidating}
              />
            </label>

            <CTAButton
              type="button"
              variant="primary"
              icon={
                isValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <QrCode className="h-4 w-4" aria-hidden="true" />
                )
              }
              onClick={() => void handleValidate()}
              disabled={isValidating}
            >
              {isValidating ? 'Validando...' : 'Validar entrada'}
            </CTAButton>

            {result ? (
              <div className={`rounded-lg border p-5 ${resultStyles[result.result]}`} role="status">
                <div className="flex items-start gap-3">
                  {result.result === 'checked_in' ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  ) : result.result === 'already_used' ? (
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  ) : (
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  )}
                  <div>
                    <p className="font-display text-sm font-bold uppercase tracking-[0.12em]">
                      {result.result === 'checked_in' ? 'Entrada valida' : 'Revision requerida'}
                    </p>
                    <p className="mt-2 text-sm leading-6">{result.message}</p>
                    {result.attendeeId ? <p className="mt-2 text-xs opacity-80">Asistente: {result.attendeeId}</p> : null}
                    {result.eventId ? <p className="mt-1 text-xs opacity-80">Evento: {result.eventId}</p> : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
