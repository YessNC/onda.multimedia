import { CalendarDays } from 'lucide-react'
import { useI18n } from '../hooks/useI18n'
import EventsCarousel from '../components/events/EventsCarousel'
import GlowCard from '../components/shared/GlowCard'
import SectionTitle from '../components/shared/SectionTitle'
import { usePublicEvents } from '../hooks/usePublicEvents'

export default function Eventos() {
  const { t } = useI18n()
  const { errorMessage, events: publishedEvents, isLoading } = usePublicEvents()

  return (
    <section className="py-20">
      <div className="onda-container">
        <SectionTitle
          eyebrow={t('events-preview.eyebrow')}
          title={t('events-preview.title')}
          subtitle={t('events.description')}
        />

        {isLoading ? (
          <GlowCard className="mt-10 border-dashed border-onda-purple/35 text-center">
            <p className="text-sm font-semibold text-zinc-600 dark:text-onda-muted">Cargando eventos...</p>
          </GlowCard>
        ) : publishedEvents.length > 0 ? (
          <div className="mt-10">
            <EventsCarousel events={publishedEvents} />
          </div>
        ) : (
          <GlowCard className="mt-10 grid gap-4 border-dashed border-onda-purple/35 text-center">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-md bg-onda-purple/10 text-onda-purple dark:bg-onda-purple/20 dark:text-onda-lavender">
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold uppercase tracking-[0.16em] text-zinc-950 dark:text-white">
                {t('events.empty')}
              </h3>
              {errorMessage ? (
                <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-onda-muted">{errorMessage}</p>
              ) : null}
            </div>
          </GlowCard>
        )}
      </div>
    </section>
  )
}
