import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bell, BellRing, Check, Loader2, RefreshCw, Volume2, X } from 'lucide-react'
import { COMMUNITY_WELCOME_UPDATED_EVENT, readCommunityBoolean } from '../../lib/communityWelcome'
import { supabaseAdmin as supabase } from '../../lib/supabaseAdminClient'
import { cn } from '../../lib/utils'

type CommunityWelcomePending = {
  attendee_id: string
  community_consent_at?: string | null
  created_at?: string | null
  email?: string | null
  event_date?: string | null
  event_id?: string | null
  event_title?: string | null
  first_name?: string | null
  full_name?: string | null
  last_name?: string | null
}

type AdminToast = {
  body: string
  id: string
  title: string
}

type BrowserNotificationStatus = NotificationPermission | 'unsupported'

const pendingListLimit = 500

function readString(value: unknown) {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return ''
}

function getBrowserNotificationStatus(): BrowserNotificationStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission
}

function getPendingName(pending: CommunityWelcomePending | null | undefined) {
  if (!pending) return 'Asistente'

  return (
    readString(pending.full_name) ||
    `${readString(pending.first_name)} ${readString(pending.last_name)}`.trim() ||
    readString(pending.email) ||
    'Asistente'
  )
}

function formatDateTime(value?: string | null) {
  const rawValue = readString(value)

  if (!rawValue) return 'Sin fecha'

  const date = new Date(rawValue)

  if (Number.isNaN(date.getTime())) return rawValue

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export default function AdminWelcomeNotifications() {
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [isPreparingNotifications, setIsPreparingNotifications] = useState(false)
  const [markingAttendeeId, setMarkingAttendeeId] = useState<string | null>(null)
  const [notificationStatus, setNotificationStatus] = useState<BrowserNotificationStatus>(() =>
    getBrowserNotificationStatus(),
  )
  const [pendingCount, setPendingCount] = useState(0)
  const [pendingRows, setPendingRows] = useState<CommunityWelcomePending[]>([])
  const [toasts, setToasts] = useState<AdminToast[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const hasLoadedInitialRowsRef = useRef(false)
  const isMountedRef = useRef(false)
  const notifiedAttendeeIdsRef = useRef<Set<string>>(new Set())
  const originalTitleRef = useRef('')
  const toastTimersRef = useRef<number[]>([])

  const notificationButtonLabel = useMemo(() => {
    if (notificationStatus === 'granted' && audioEnabled) return 'Notificaciones activas'
    if (notificationStatus === 'unsupported' && audioEnabled) return 'Sonido activo'
    return 'Activar notificaciones'
  }, [audioEnabled, notificationStatus])

  const notificationHint = useMemo(() => {
    if (notificationStatus === 'unsupported') return 'Este navegador no soporta notificaciones de escritorio.'
    if (notificationStatus === 'denied') return 'Permiso de escritorio denegado. El sonido queda disponible si lo activaste.'
    if (notificationStatus === 'granted' && audioEnabled) return 'Avisos de escritorio y sonido activos en este panel.'
    if (notificationStatus === 'granted') return 'Permiso concedido. Activa el sonido con una interaccion.'
    return 'El sonido se desbloquea con este boton. El permiso de escritorio depende del navegador.'
  }, [audioEnabled, notificationStatus])

  const fetchPendingRows = useCallback(async () => {
    const unifiedResponse = await supabase.rpc('get_community_welcome_pending', { p_limit: pendingListLimit })

    if (!unifiedResponse.error) {
      return ((unifiedResponse.data ?? []) as CommunityWelcomePending[]).filter((row) => readString(row.attendee_id))
    }

    const isMissingUnifiedRpc =
      unifiedResponse.error.code === 'PGRST202' ||
      unifiedResponse.error.message.toLowerCase().includes('get_community_welcome_pending')

    if (!isMissingUnifiedRpc) throw unifiedResponse.error

    const { data, error } = await supabase.rpc('list_community_welcome_pending', { p_limit: pendingListLimit })

    if (error) throw error

    return ((data ?? []) as CommunityWelcomePending[]).filter((row) => readString(row.attendee_id))
  }, [])

  const loadPending = useCallback(async (showLoader = false) => {
    if (showLoader) setIsLoading(true)
    setErrorMessage('')

    try {
      const nextRows = await fetchPendingRows()

      if (!isMountedRef.current) return

      setPendingCount(nextRows.length)
      setPendingRows(nextRows)

      if (!hasLoadedInitialRowsRef.current) {
        notifiedAttendeeIdsRef.current = new Set(nextRows.map((row) => row.attendee_id))
        hasLoadedInitialRowsRef.current = true
      }
    } catch (error) {
      if (!isMountedRef.current) return
      setErrorMessage(error instanceof Error ? error.message : 'No pudimos cargar pendientes de bienvenida.')
    } finally {
      if (isMountedRef.current) setIsLoading(false)
    }
  }, [fetchPendingRows])

  const playAlertSound = useCallback((volume = 0.08) => {
    const audioContext = audioContextRef.current

    if (!audioContext) return

    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    const startTime = audioContext.currentTime

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, startTime)
    oscillator.frequency.exponentialRampToValueAtTime(1320, startTime + 0.12)
    gain.gain.setValueAtTime(0.0001, startTime)
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.22)

    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start(startTime)
    oscillator.stop(startTime + 0.24)
  }, [])

  const unlockAlertAudio = useCallback(async () => {
    if (typeof window === 'undefined') return false

    const AudioContextClass =
      window.AudioContext ||
      (window as Window & {
        webkitAudioContext?: typeof AudioContext
      }).webkitAudioContext

    if (!AudioContextClass) return false

    const audioContext = audioContextRef.current ?? new AudioContextClass()
    audioContextRef.current = audioContext

    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }

    playAlertSound(0.035)
    return true
  }, [playAlertSound])

  const dismissToast = useCallback((toastId: string) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== toastId))
  }, [])

  const clearToastTimers = useCallback(() => {
    for (const timerId of toastTimersRef.current) {
      window.clearTimeout(timerId)
    }

    toastTimersRef.current = []
  }, [])

  const pushToast = useCallback(
    (pending: CommunityWelcomePending) => {
      const name = getPendingName(pending)
      const eventTitle = readString(pending.event_title) || 'Comunidad ONDA'
      const toast: AdminToast = {
        body: `${eventTitle} - ${readString(pending.email) || 'Sin correo'}`,
        id: `${pending.attendee_id}-${Date.now()}`,
        title: `${name} autorizo comunidad`,
      }

      setToasts((currentToasts) => [...currentToasts, toast].slice(-3))

      const timerId = window.setTimeout(() => dismissToast(toast.id), 6500)
      toastTimersRef.current.push(timerId)
    },
    [dismissToast],
  )

  const showDesktopNotification = useCallback(
    (pending: CommunityWelcomePending) => {
      if (notificationStatus !== 'granted' || typeof window === 'undefined' || !('Notification' in window)) return

      try {
        const name = getPendingName(pending)
        const eventTitle = readString(pending.event_title) || 'Comunidad ONDA'

        new Notification('Comunidad pendiente', {
          body: `${name} - ${eventTitle}`,
          silent: true,
          tag: `onda-community-${pending.attendee_id}`,
        })
      } catch (error) {
        console.warn('[AdminWelcomeNotifications] desktop notification failed', error)
      }
    },
    [notificationStatus],
  )

  const notifyPending = useCallback(
    (pending: CommunityWelcomePending) => {
      pushToast(pending)
      showDesktopNotification(pending)

      if (audioEnabled && audioContextRef.current) {
        void audioContextRef.current
          .resume()
          .then(() => playAlertSound())
          .catch((error) => {
            console.warn('[AdminWelcomeNotifications] alert audio failed', error)
          })
      }
    },
    [audioEnabled, playAlertSound, pushToast, showDesktopNotification],
  )

  useEffect(() => {
    isMountedRef.current = true
    originalTitleRef.current = document.title

    return () => {
      isMountedRef.current = false
      document.title = originalTitleRef.current
      clearToastTimers()

      const audioContext = audioContextRef.current

      void audioContext?.close().catch(() => undefined)
    }
  }, [clearToastTimers])

  useEffect(() => {
    const loadTimerId = window.setTimeout(() => {
      void loadPending(true)
    }, 0)

    return () => window.clearTimeout(loadTimerId)
  }, [loadPending])

  useEffect(() => {
    if (pendingCount > 0) {
      document.title = `(${pendingCount}) Comunidad pendiente`
      return
    }

    if (originalTitleRef.current) {
      document.title = originalTitleRef.current
    }
  }, [pendingCount])

  useEffect(() => {
    if (!isOpen) return undefined

    function handlePointerDown(pointerEvent: PointerEvent) {
      const target = pointerEvent.target

      if (target instanceof Element && target.closest('[data-community-welcome-notifications]')) return
      setIsOpen(false)
    }

    function handleKeyDown(keyboardEvent: KeyboardEvent) {
      if (keyboardEvent.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  useEffect(() => {
    const handlePendingChange = (payload: { new?: Record<string, unknown> }) => {
      const nextRecord = payload.new ?? {}
      const attendeeId = readString(nextRecord.id)

      if (!readCommunityBoolean(nextRecord.community_consent)) return

      void loadPending(false)

      if (!attendeeId || readCommunityBoolean(nextRecord.community_welcome_sent)) return
      if (notifiedAttendeeIdsRef.current.has(attendeeId)) return

      const pending: CommunityWelcomePending = {
        attendee_id: attendeeId,
        community_consent_at: readString(nextRecord.community_consent_at) || null,
        created_at: readString(nextRecord.created_at) || null,
        email: readString(nextRecord.email) || null,
        event_id: readString(nextRecord.event_id) || null,
        first_name: readString(nextRecord.first_name) || null,
        full_name: readString(nextRecord.full_name) || null,
        last_name: readString(nextRecord.last_name) || null,
      }

      notifiedAttendeeIdsRef.current.add(attendeeId)
      notifyPending(pending)
    }

    const channel = supabase
      .channel('admin-community-welcome-pending')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          filter: 'community_consent=eq.true',
          schema: 'public',
          table: 'event_attendees',
        },
        handlePendingChange,
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          filter: 'community_consent=eq.true',
          schema: 'public',
          table: 'event_attendees',
        },
        handlePendingChange,
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [loadPending, notifyPending])

  useEffect(() => {
    function handleCommunityWelcomeUpdated() {
      void loadPending(false)
    }

    window.addEventListener(COMMUNITY_WELCOME_UPDATED_EVENT, handleCommunityWelcomeUpdated)

    return () => {
      window.removeEventListener(COMMUNITY_WELCOME_UPDATED_EVENT, handleCommunityWelcomeUpdated)
    }
  }, [loadPending])

  async function handleEnableNotifications() {
    setIsPreparingNotifications(true)
    setErrorMessage('')

    try {
      let nextNotificationStatus = getBrowserNotificationStatus()

      if (nextNotificationStatus !== 'unsupported' && nextNotificationStatus === 'default') {
        nextNotificationStatus = await Notification.requestPermission()
      }

      const didUnlockAudio = await unlockAlertAudio()

      setNotificationStatus(nextNotificationStatus)
      setAudioEnabled(didUnlockAudio)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No pudimos activar notificaciones.')
    } finally {
      setIsPreparingNotifications(false)
    }
  }

  async function handleMarkSent(pending: CommunityWelcomePending) {
    const attendeeId = readString(pending.attendee_id)

    if (!attendeeId) return

    setMarkingAttendeeId(attendeeId)
    setErrorMessage('')

    try {
      const { error } = await supabase.rpc('mark_community_welcome_sent', {
        p_attendee_id: attendeeId,
      })

      if (error) throw error

      setPendingRows((currentRows) => currentRows.filter((row) => row.attendee_id !== attendeeId))
      setPendingCount((currentCount) => Math.max(0, currentCount - 1))
      window.dispatchEvent(
        new CustomEvent(COMMUNITY_WELCOME_UPDATED_EVENT, {
          detail: { attendeeId, communityWelcomeSent: true },
        }),
      )
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No pudimos marcar el correo como enviado.')
    } finally {
      setMarkingAttendeeId(null)
    }
  }

  return (
    <div className="relative flex min-w-0 flex-wrap items-center gap-2" data-community-welcome-notifications>
      <button
        type="button"
        onClick={() => void handleEnableNotifications()}
        disabled={isPreparingNotifications}
        className={cn(
          'inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-md border border-onda-purple/35 bg-[#10051f] px-3 py-2 font-display text-[0.64rem] font-bold uppercase tracking-[0.12em] text-onda-soft transition duration-300 hover:border-onda-lavender hover:bg-onda-purple/25 disabled:cursor-not-allowed disabled:opacity-60',
          notificationStatus === 'granted' &&
            audioEnabled &&
            'border-emerald-400/45 bg-emerald-500/14 text-emerald-100',
        )}
        aria-label={notificationButtonLabel}
      >
        {isPreparingNotifications ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Volume2 className="h-4 w-4" aria-hidden="true" />
        )}
        <span className="min-w-0 break-words">{notificationButtonLabel}</span>
      </button>

      <button
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        className={cn(
          'relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-onda-purple/35 bg-[#10051f] text-onda-soft transition duration-300 hover:border-onda-lavender hover:bg-onda-purple/25',
          pendingCount > 0 && 'border-onda-lavender bg-onda-purple text-white shadow-[0_0_22px_rgba(123,44,255,0.32)]',
        )}
        aria-expanded={isOpen}
        aria-label={`Pendientes de bienvenida: ${pendingCount}`}
      >
        {pendingCount > 0 ? (
          <BellRing className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Bell className="h-5 w-5" aria-hidden="true" />
        )}
        {pendingCount > 0 ? (
          <span className="absolute -right-2 -top-2 inline-flex min-w-6 items-center justify-center rounded-full border border-white bg-emerald-400 px-1.5 py-0.5 font-display text-[0.62rem] font-extrabold leading-none text-onda-black">
            {pendingCount > 99 ? '99+' : pendingCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-[calc(100%+0.75rem)] z-[90] w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-onda-lavender/24 bg-onda-black text-onda-soft shadow-[0_24px_70px_rgba(15,23,42,0.34)]">
          <div className="flex items-start justify-between gap-3 border-b border-onda-purple/12 px-4 py-3">
            <div className="min-w-0">
              <p className="font-display text-[0.64rem] font-bold uppercase tracking-[0.18em] text-onda-lavender">
                Comunidad
              </p>
              <h2 className="mt-1 font-display text-sm font-extrabold uppercase tracking-[0.12em] text-white">
                Pendientes de bienvenida
              </h2>
            </div>
            <button
              type="button"
              onClick={() => void loadPending(true)}
              disabled={isLoading}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-onda-purple/30 bg-white/5 text-onda-lavender transition hover:bg-onda-purple hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Actualizar pendientes"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>

          <div className="max-h-[28rem] overflow-y-auto p-3">
            {errorMessage ? (
              <p className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100">
                {errorMessage}
              </p>
            ) : null}

            {isLoading ? (
              <div className="flex min-h-28 items-center justify-center rounded-md border border-onda-purple/18 bg-white/[0.04] text-sm font-semibold text-onda-muted">
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-onda-purple" aria-hidden="true" />
                Cargando pendientes...
              </div>
            ) : pendingRows.length === 0 ? (
              <div className="rounded-md border border-dashed border-onda-purple/24 px-4 py-6 text-sm font-semibold text-onda-muted">
                No hay correos de bienvenida pendientes.
              </div>
            ) : (
              <div className="grid gap-2">
                {pendingRows.map((pending) => {
                  const attendeeId = pending.attendee_id
                  const isMarking = markingAttendeeId === attendeeId

                  return (
                    <div
                      key={attendeeId}
                      className="rounded-md border border-onda-purple/18 bg-white/[0.04] p-3"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-white">{getPendingName(pending)}</div>
                        <div className="mt-1 break-all text-xs font-semibold text-onda-muted">
                          {readString(pending.email) || 'Sin correo'}
                        </div>
                        <div className="mt-2 text-xs leading-5 text-onda-muted">
                          {readString(pending.event_title) || 'Evento'} -{' '}
                          {formatDateTime(pending.community_consent_at || pending.created_at)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleMarkSent(pending)}
                        disabled={Boolean(markingAttendeeId)}
                        className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-md border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 font-display text-[0.62rem] font-bold uppercase tracking-[0.12em] text-emerald-100 transition hover:bg-emerald-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isMarking ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Check className="h-4 w-4" aria-hidden="true" />
                        )}
                        <span>{isMarking ? 'Marcando...' : 'Marcar correo enviado'}</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="border-t border-onda-purple/12 px-4 py-3 text-xs font-semibold leading-5 text-onda-muted">
            {notificationHint}
          </div>
        </div>
      ) : null}

      {toasts.length > 0 ? (
        <div className="fixed right-4 top-24 z-[110] grid w-[min(24rem,calc(100vw-2rem))] gap-3">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role="status"
              className="rounded-lg border border-onda-lavender/35 bg-onda-black/94 p-4 text-onda-soft shadow-[0_18px_50px_rgba(123,44,255,0.32)] backdrop-blur-xl"
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-onda-purple/24 text-onda-lavender">
                  <BellRing className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-xs font-bold uppercase tracking-[0.14em] text-white">
                    {toast.title}
                  </div>
                  <div className="mt-1 break-words text-xs font-semibold leading-5 text-onda-muted">{toast.body}</div>
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-onda-muted transition hover:border-onda-lavender/50 hover:text-white"
                  aria-label="Cerrar notificacion"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
