import { ArrowRight, CalendarDays, MapPin, Sparkles, Ticket } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { PlaceholderEvent } from '../../data/placeholderEvents'
import { useI18n } from '../../hooks/useI18n'
import {
  type EventRecord,
  formatEventDate,
  getEventDateRaw,
  getEventDescription,
  getEventDetailPath,
  getEventImageSource,
  getEventLocation,
  getEventProducerName,
  getEventTitle,
  getEventVisibility,
  getPublicEventVisibilityBadgeLabel,
  getPublicEventStatusLabel,
  getTicketButtonLabel,
  hasActiveTicketButton,
  readString,
} from '../../lib/events'
import EventPosterFrame from './EventPosterFrame'

export type EventCardData = PlaceholderEvent | EventRecord

type EventCardProps = {
  event: EventCardData
}

function isPlaceholderEvent(event: EventCardData): event is PlaceholderEvent {
  return 'titleKey' in event
}

export default function EventCard({ event }: EventCardProps) {
  const { t } = useI18n()
  const isPlaceholder = isPlaceholderEvent(event)
  const title = isPlaceholder ? t(event.titleKey) : getEventTitle(event)
  const dateLabel = isPlaceholder ? t(event.dateKey) : formatEventDate(getEventDateRaw(event))
  const placeLabel = isPlaceholder ? t(event.placeKey) : getEventLocation(event) || 'Lugar por confirmar'
  const statusLabel = isPlaceholder
    ? event.status === 'proximo'
      ? t('events.upcoming')
      : t('events.archive')
    : getPublicEventStatusLabel(event)
  const description = isPlaceholder
    ? ''
    : getEventDescription(event) || 'Pronto compartiremos más detalles de esta experiencia.'
  const imagePath = isPlaceholder ? event.imagePath : getEventImageSource(event)
  const visibility = isPlaceholder ? 'public' : getEventVisibility(event)
  const isPrivate = visibility === 'private'
  const visibilityLabel = isPlaceholder ? '' : getPublicEventVisibilityBadgeLabel(event)
  const producerName = isPlaceholder ? '' : getEventProducerName(event)
  const hasTickets = !isPlaceholder && hasActiveTicketButton(event)
  const ticketUrl = !isPlaceholder ? readString(event.ticket_url) : ''
  const detailPath = isPlaceholder ? '/eventos' : getEventDetailPath(event)

  return (
    <article className="glass-panel group flex h-full min-w-0 flex-col overflow-hidden rounded-lg transition duration-300 hover:-translate-y-1 hover:border-onda-lavender/60 hover:shadow-[0_30px_90px_rgba(123,44,255,0.22)]">
      <EventPosterFrame
        src={imagePath}
        alt={title}
        className="aspect-[4/5] rounded-none border-x-0 border-t-0"
        imageClassName="transition duration-500 group-hover:scale-[1.012]"
      />
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-onda-purple/25 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-onda-purple dark:text-onda-lavender">
            {statusLabel}
          </span>
          {!isPlaceholder ? (
            <span className="rounded-full border border-onda-purple/25 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-onda-purple dark:text-onda-lavender">
              {visibilityLabel}
            </span>
          ) : null}
        </div>

        <h3 className="font-display text-lg font-bold uppercase tracking-[0.08em] text-zinc-950 dark:text-white">
          {title}
        </h3>

        <div className="grid gap-2 text-sm text-zinc-600 dark:text-onda-muted">
          <span className="inline-flex items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" /> {dateLabel}
          </span>
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" /> {placeLabel}
          </span>
        </div>

        {description || isPrivate ? (
          <p className="text-sm leading-7 text-zinc-600 dark:text-onda-muted">
            {description || 'Acceso solo para invitados confirmados.'}
          </p>
        ) : null}

        {!isPlaceholder ? (
          <p className="inline-flex items-start gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-onda-purple dark:text-onda-lavender">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Una experiencia {producerName}</span>
          </p>
        ) : null}

        <div className="mt-auto grid gap-3 pt-1">
          <Link
            to={detailPath}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-onda-purple px-4 py-3 text-center font-display text-xs font-bold uppercase tracking-[0.14em] text-white shadow-[0_0_24px_rgba(123,44,255,0.3)] transition hover:bg-onda-electric"
          >
            <span>Ver evento</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>

          {hasTickets ? (
            <a
              href={ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-onda-purple/30 bg-white/65 px-4 py-3 text-center font-display text-xs font-bold uppercase tracking-[0.14em] text-onda-purple transition hover:border-onda-purple hover:bg-onda-purple/10 dark:bg-white/5 dark:text-onda-soft"
            >
              <Ticket className="h-4 w-4" aria-hidden="true" />
              {getTicketButtonLabel(event)}
            </a>
          ) : null}
        </div>
      </div>
    </article>
  )
}
