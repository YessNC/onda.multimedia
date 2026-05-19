import { CalendarDays, MapPin } from 'lucide-react'
import type { PlaceholderEvent } from '../../data/placeholderEvents'
import AssetFrame from '../shared/AssetFrame'
import { useI18n } from '../../hooks/useI18n'

type EventCardProps = {
  event: PlaceholderEvent
}

export default function EventCard({ event }: EventCardProps) {
  const { t } = useI18n()
  return (
    <article className="glass-panel overflow-hidden rounded-lg">
      <AssetFrame src={event.imagePath} alt={t(event.titleKey)} className="aspect-[16/10] rounded-none border-0" />
      <div className="p-5">
        <span className="rounded-full border border-onda-purple/25 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-onda-purple dark:text-onda-lavender">
          {event.status === 'proximo' ? t('events.upcoming') : t('events.archive')}
        </span>
        <h3 className="mt-4 font-display text-lg font-bold uppercase tracking-[0.12em] text-zinc-950 dark:text-white">
          {t(event.titleKey)}
        </h3>
        <div className="mt-4 grid gap-2 text-sm text-zinc-600 dark:text-onda-muted">
          <span className="inline-flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> {t(event.dateKey)}
          </span>
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4" /> {t(event.placeKey)}
          </span>
        </div>
      </div>
    </article>
  )
}
