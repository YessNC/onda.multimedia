import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, QrCode } from 'lucide-react'
import { useI18n } from '../hooks/useI18n'
import AdminSignOutButton from '../components/admin/AdminSignOutButton'
import AdminEventTable from '../components/admin/AdminEventTable'
import EventForm, { type EventFormSaveAction } from '../components/admin/EventForm'
import ImageUploader from '../components/admin/ImageUploader'
import CTAButton from '../components/shared/CTAButton'
import SectionTitle from '../components/shared/SectionTitle'
import {
  type EventRecord,
  compareEventsByDate,
  getEventStatus,
  hasActiveTicketButton,
  isEventDeleted,
  readBoolean,
} from '../lib/events'
import { supabase } from '../lib/supabaseClient'

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Ocurrio un error inesperado.'
}

export default function AdminEventos() {
  const { t } = useI18n()
  const [actionMessage, setActionMessage] = useState('')
  const [busyEventId, setBusyEventId] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<EventRecord | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [events, setEvents] = useState<EventRecord[]>([])
  const [formResetKey, setFormResetKey] = useState(0)
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const formPanelRef = useRef<HTMLDivElement | null>(null)
  const listPanelRef = useRef<HTMLDivElement | null>(null)

  const loadEvents = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    const response = await supabase
      .from('events')
      .select('*')
      .is('deleted_at', null)
      .order('event_date', { ascending: true })

    if (response.error) {
      const fallback = await supabase.from('events').select('*')

      if (fallback.error) {
        setErrorMessage(fallback.error.message)
        setIsLoading(false)
        return
      }

      setEvents(((fallback.data ?? []) as EventRecord[]).filter((event) => !isEventDeleted(event)).sort(compareEventsByDate))
      setIsLoading(false)
      return
    }

    setEvents(((response.data ?? []) as EventRecord[]).sort(compareEventsByDate))
    setIsLoading(false)
  }, [])

  useEffect(() => {
    const loadTimeoutId = window.setTimeout(() => {
      void loadEvents()
    }, 0)

    return () => window.clearTimeout(loadTimeoutId)
  }, [loadEvents])

  const stats = useMemo(
    () => [
      { label: 'Activos', value: events.length },
      { label: 'Borradores', value: events.filter((event) => getEventStatus(event) === 'draft').length },
      { label: 'Tickets', value: events.filter(hasActiveTicketButton).length },
      { label: 'QR', value: events.filter((event) => readBoolean(event.qr_checkin_enabled)).length },
    ],
    [events],
  )

  async function updateEvent(event: EventRecord, payload: Record<string, unknown>, message: string) {
    setBusyEventId(event.id)
    setActionMessage('')
    setErrorMessage('')

    try {
      const { data, error } = await supabase.from('events').update(payload).eq('id', event.id).select('*').single()

      if (error) throw error

      const updatedEvent = data as EventRecord

      setActionMessage(message)
      setHighlightedEventId(updatedEvent.id)
      setEvents((currentEvents) => {
        if (isEventDeleted(updatedEvent)) {
          return currentEvents.filter((currentEvent) => currentEvent.id !== updatedEvent.id)
        }

        return currentEvents
          .map((currentEvent) => (currentEvent.id === updatedEvent.id ? updatedEvent : currentEvent))
          .sort(compareEventsByDate)
      })

      if (editingEvent?.id === updatedEvent.id) {
        setEditingEvent(isEventDeleted(updatedEvent) ? null : updatedEvent)
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setBusyEventId(null)
    }
  }

  function focusEventForm() {
    window.setTimeout(() => {
      formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      const firstField = formPanelRef.current?.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        'input:not([type="hidden"]), textarea, select',
      )

      firstField?.focus({ preventScroll: true })
    }, 0)
  }

  function showEventList() {
    window.setTimeout(() => {
      listPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }

  function resetFormMode(message?: string) {
    setEditingEvent(null)
    setFormResetKey((currentKey) => currentKey + 1)

    if (message) {
      setActionMessage(message)
    }
  }

  function handleSaved(event: EventRecord, action: EventFormSaveAction) {
    const messageByAction: Record<EventFormSaveAction, string> = {
      draft: 'Borrador guardado correctamente. Ya aparece en la lista.',
      published: 'Evento publicado correctamente. Ya aparece en la lista.',
      updated: 'Cambios guardados correctamente. El formulario quedo listo para otro evento.',
    }

    setHighlightedEventId(event.id)
    setEvents((currentEvents) =>
      [event, ...currentEvents.filter((currentEvent) => currentEvent.id !== event.id)]
        .filter((currentEvent) => !isEventDeleted(currentEvent))
        .sort(compareEventsByDate),
    )
    resetFormMode(messageByAction[action])
    showEventList()
    void loadEvents()
  }

  function handleNewEvent() {
    setErrorMessage('')
    setHighlightedEventId(null)
    resetFormMode('Formulario limpio. Listo para crear un nuevo evento.')
    focusEventForm()
  }

  function handleEditEvent(event: EventRecord) {
    setEditingEvent(event)
    setActionMessage('Editando evento. Guarda cambios o cancela la edicion para volver a nuevo evento.')
    setHighlightedEventId(event.id)
    focusEventForm()
  }

  function handleCancelEdit() {
    setHighlightedEventId(null)
    resetFormMode('Edicion cancelada. Formulario listo para crear un nuevo evento.')
    focusEventForm()
  }

  function handlePublish(event: EventRecord) {
    void updateEvent(
      event,
      {
        published_at: new Date().toISOString(),
        status: 'upcoming',
      },
      'Evento publicado.',
    )
  }

  function handleArchive(event: EventRecord) {
    void updateEvent(event, { status: 'archived' }, 'Evento archivado.')
  }

  function handleDelete(event: EventRecord) {
    const confirmed = window.confirm('Este evento se ocultara del panel y del sitio publico. Se conservara en Supabase.')

    if (!confirmed) return

    void updateEvent(event, { deleted_at: new Date().toISOString() }, 'Evento eliminado con soft delete.')
  }

  return (
    <section className="dark min-h-[calc(100vh-5rem)] w-full max-w-full overflow-x-hidden bg-onda-night py-16 text-onda-soft sm:py-20">
      <div className="onda-container min-w-0 max-w-full">
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <SectionTitle
            eyebrow={t('admin.eyebrow')}
            title={t('admin.events-title')}
            subtitle={t('admin.events-description')}
          />
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap lg:justify-end">
            <CTAButton
              type="button"
              variant="secondary"
              icon={<Plus className="h-4 w-4" aria-hidden="true" />}
              onClick={handleNewEvent}
            >
              Nuevo evento
            </CTAButton>
            <CTAButton
              to="/admin/check-in"
              variant="secondary"
              icon={<QrCode className="h-4 w-4" aria-hidden="true" />}
            >
              Registro de entrada
            </CTAButton>
            <AdminSignOutButton />
          </div>
        </div>

        <div className="mt-8 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="glass-panel min-w-0 rounded-lg bg-onda-black/62 p-4">
              <div className="font-display text-2xl font-extrabold text-white">{stat.value}</div>
              <div className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-onda-lavender">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {actionMessage ? (
          <p className="mt-6 rounded-md border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100">
            {actionMessage}
          </p>
        ) : null}

        <div className="mt-8 grid w-full min-w-0 max-w-full gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,520px)]">
          <div ref={listPanelRef} className="min-w-0 max-w-full scroll-mt-24 overflow-hidden">
            <AdminEventTable
              busyEventId={busyEventId}
              errorMessage={errorMessage}
              events={events}
              highlightedEventId={highlightedEventId}
              isLoading={isLoading}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onEdit={handleEditEvent}
              onPublish={handlePublish}
            />
          </div>
          <div ref={formPanelRef} className="grid min-w-0 max-w-full scroll-mt-24 content-start gap-6 overflow-hidden">
            <EventForm
              key={editingEvent?.id ?? `new-${formResetKey}`}
              initialEvent={editingEvent}
              onCancelEdit={handleCancelEdit}
              onSaved={handleSaved}
            />
            <ImageUploader />
          </div>
        </div>
      </div>
    </section>
  )
}
