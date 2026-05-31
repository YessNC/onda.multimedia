import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Camera, ExternalLink, Film, MapPin, Sparkles, Ticket, Video } from 'lucide-react'
import EventPosterFrame from '../components/events/EventPosterFrame'
import CTAButton from '../components/shared/CTAButton'
import GlowCard from '../components/shared/GlowCard'
import {
  type EventRecord,
  formatEventDate,
  getEventDateRaw,
  getEventDescription,
  getEventImageSource,
  getEventLocation,
  getEventProducerName,
  getEventTitle,
  getEventVisibility,
  getPublicEventVisibilityBadgeLabel,
  getTicketButtonLabel,
  hasActiveTicketButton,
  isEventPublished,
  readString,
} from '../lib/events'
import { supabase } from '../lib/supabaseClient'

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Ocurrió un error inesperado.'
}

const futureContentItems = [
  { icon: Camera, label: 'Fotos' },
  { icon: Video, label: 'Videos' },
  { icon: Film, label: 'Reels' },
  { icon: Sparkles, label: 'Aftermovie' },
  { icon: ExternalLink, label: 'Links externos' },
]

export default function EventoDetalle() {
  const { eventId } = useParams<{ eventId: string }>()
  const [event, setEvent] = useState<EventRecord | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadEvent() {
      setIsLoading(true)
      setErrorMessage('')

      if (!eventId) {
        setEvent(null)
        setIsLoading(false)
        return
      }

      try {
        const { data, error } = await supabase.from('events').select('*').eq('id', eventId).maybeSingle()

        if (error) throw error

        if (!isMounted) return

        const nextEvent = data as EventRecord | null
        setEvent(nextEvent && isEventPublished(nextEvent) ? nextEvent : null)
      } catch (error) {
        if (!isMounted) return
        setErrorMessage(getErrorMessage(error))
        setEvent(null)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadEvent()

    return () => {
      isMounted = false
    }
  }, [eventId])

  if (isLoading) {
    return (
      <section className="py-20">
        <div className="onda-container">
          <GlowCard className="border-dashed border-onda-purple/35 text-center">
            <p className="text-sm font-semibold text-zinc-600 dark:text-onda-muted">Cargando evento...</p>
          </GlowCard>
        </div>
      </section>
    )
  }

  if (!event) {
    return (
      <section className="py-20">
        <div className="onda-container">
          <GlowCard className="grid gap-5 border-dashed border-onda-purple/35 text-center">
            <div>
              <h1 className="font-display text-2xl font-extrabold uppercase tracking-[0.12em] text-zinc-950 dark:text-white">
                Evento no disponible
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-onda-muted">
                {errorMessage || 'La fecha no está publicada o ya no se encuentra disponible en la cartelera pública.'}
              </p>
            </div>
            <CTAButton to="/eventos" variant="secondary" icon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}>
              Volver a cartelera
            </CTAButton>
          </GlowCard>
        </div>
      </section>
    )
  }

  const title = getEventTitle(event)
  const dateLabel = formatEventDate(getEventDateRaw(event))
  const locationLabel = getEventLocation(event) || 'Lugar por confirmar'
  const description = getEventDescription(event) || 'Pronto compartiremos más detalles de esta experiencia.'
  const imagePath = getEventImageSource(event)
  const visibility = getEventVisibility(event)
  const isPrivate = visibility === 'private'
  const hasTickets = hasActiveTicketButton(event)
  const ticketUrl = readString(event.ticket_url)
  const producerName = getEventProducerName(event)

  return (
    <>
      <section className="dark relative isolate overflow-hidden bg-onda-night py-12 text-onda-soft sm:py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-onda-lavender/50 to-transparent"
        />
        <div className="onda-container">
          <Link
            to="/eventos"
            className="mb-8 inline-flex min-h-11 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-4 py-3 font-display text-xs font-bold uppercase tracking-[0.14em] text-onda-soft transition hover:border-onda-lavender/45 hover:bg-onda-purple/15"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver a cartelera
          </Link>

          <div className="grid gap-8 lg:grid-cols-[minmax(260px,0.82fr)_minmax(0,1.18fr)] lg:items-start">
            <EventPosterFrame
              src={imagePath}
              alt={title}
              className="mx-auto aspect-[1592/2048] w-full max-w-[34rem]"
              imageClassName="p-3 sm:p-4"
            />

            <div className="glass-panel grid gap-6 rounded-lg bg-onda-black/70 p-5 sm:p-7 lg:p-8">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-onda-lavender/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-onda-lavender">
                  Próximo
                </span>
                <span className="rounded-full border border-onda-lavender/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-onda-lavender">
                  {getPublicEventVisibilityBadgeLabel(event)}
                </span>
              </div>

              <div>
                <h1 className="font-display text-3xl font-extrabold uppercase tracking-[0.08em] text-white sm:text-4xl lg:text-5xl">
                  {title}
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-onda-muted sm:text-lg">{description}</p>
              </div>

              <div className="grid gap-3 text-sm font-semibold text-onda-soft sm:grid-cols-2">
                <span className="inline-flex min-w-0 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-4 py-3">
                  <CalendarDays className="h-4 w-4 shrink-0 text-onda-lavender" aria-hidden="true" />
                  <span className="min-w-0 break-words">{dateLabel}</span>
                </span>
                <span className="inline-flex min-w-0 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-4 py-3">
                  <MapPin className="h-4 w-4 shrink-0 text-onda-lavender" aria-hidden="true" />
                  <span className="min-w-0 break-words">{locationLabel}</span>
                </span>
              </div>

              <div className="rounded-lg border border-onda-lavender/20 bg-white/5 p-4">
                <p className="font-display text-xs font-bold uppercase tracking-[0.16em] text-onda-lavender">
                  Productor
                </p>
                <p className="mt-2 text-sm font-semibold leading-7 text-white">{producerName}</p>
              </div>

              {isPrivate ? (
                <div className="rounded-lg border border-onda-lavender/25 bg-onda-purple/12 p-4 text-sm font-semibold leading-7 text-onda-soft">
                  Acceso solo para invitados confirmados.
                </div>
              ) : hasTickets ? (
                <CTAButton
                  href={ticketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  icon={<Ticket className="h-4 w-4" aria-hidden="true" />}
                  className="w-full sm:w-fit"
                >
                  {getTicketButtonLabel(event)}
                </CTAButton>
              ) : (
                <div className="rounded-lg border border-onda-lavender/20 bg-white/5 p-4 text-sm font-semibold leading-7 text-onda-muted">
                  Información de acceso pronto disponible.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="onda-container">
          <div className="mb-8">
            <p className="mb-3 inline-flex items-center gap-2 font-display text-xs font-bold uppercase tracking-[0.3em] text-onda-purple dark:text-onda-lavender">
              <span className="h-px w-8 bg-onda-purple opacity-70" />
              Registro oficial
            </p>
            <h2 className="font-display text-3xl font-extrabold uppercase tracking-[0.1em] text-zinc-950 dark:text-white">
              Galería del evento
            </h2>
          </div>

          <div className="tech-grid overflow-hidden rounded-lg border border-dashed border-onda-purple/40 bg-white/60 p-6 shadow-[0_0_44px_rgba(123,44,255,0.14)] dark:border-onda-lavender/40 dark:bg-onda-black/55 sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-md border border-onda-purple/25 bg-white/70 text-onda-purple shadow-[0_0_28px_rgba(123,44,255,0.16)] dark:bg-onda-black/70 dark:text-onda-lavender">
                <Camera className="h-6 w-6" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-onda-purple dark:text-onda-lavender">
                  Contenido en preparación
                </p>
                <h3 className="mt-2 font-display text-xl font-extrabold uppercase tracking-[0.08em] text-zinc-950 dark:text-white">
                  Galería próximamente
                </h3>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600 dark:text-onda-muted">
                  Cuando el evento finalice, aquí compartiremos registros oficiales, fotografías y momentos destacados.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {futureContentItems.map(({ icon: Icon, label }) => (
                    <span
                      key={label}
                      className="inline-flex min-h-9 items-center gap-2 rounded-full border border-onda-purple/20 bg-white/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-onda-purple dark:bg-white/5 dark:text-onda-lavender"
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
