import { CalendarDays, MapPin, Ticket } from 'lucide-react'
import type { PlaceholderEvent } from '../../data/placeholderEvents'
import AssetFrame from '../shared/AssetFrame'
import { useI18n } from '../../hooks/useI18n'
import {
  type EventRecord,
  formatEventDate,
  getEventDateRaw,
  getEventDescription,
  getEventImagePath,
  getEventLocation,
  getEventTitle,
  getEventVisibility,
  getPublicEventStatusLabel,
  getTicketButtonLabel,
  hasActiveTicketButton,
  readString,
} from '../../lib/events'

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
  const description = isPlaceholder ? '' : getEventDescription(event)
  const imagePath = isPlaceholder ? event.imagePath : getEventImagePath(event)
  const visibility = isPlaceholder ? 'public' : getEventVisibility(event)
  const isPrivate = visibility === 'private'
  const hasTickets = !isPlaceholder && hasActiveTicketButton(event)
  const ticketUrl = !isPlaceholder ? readString(event.ticket_url) : ''

  return (
    <article className="glass-panel h-full overflow-hidden rounded-lg">
      <AssetFrame
        src={imagePath}
        alt={title}
        className="aspect-[16/10] rounded-none border-0"
        imageClassName="saturate-[1.04]"
      />
      <div className="grid gap-4 p-5">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-onda-purple/25 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-onda-purple dark:text-onda-lavender">
            {statusLabel}
          </span>
          {!isPlaceholder ? (
            <span className="rounded-full border border-onda-purple/25 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-onda-purple dark:text-onda-lavender">
              {isPrivate ? 'Solo con invitacion directa' : 'Publico'}
            </span>
          ) : null}
        </div>

        <h3 className="font-display text-lg font-bold uppercase tracking-[0.12em] text-zinc-950 dark:text-white">
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

        {hasTickets ? (
          <a
            href={ticketUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-md bg-onda-purple px-4 py-3 font-display text-xs font-bold uppercase tracking-[0.14em] text-white shadow-[0_0_24px_rgba(123,44,255,0.3)] transition hover:bg-onda-electric"
          >
            <Ticket className="h-4 w-4" aria-hidden="true" />
            {getTicketButtonLabel(event)}
          </a>
        ) : null}
      </div>
    </article>
  )
}
