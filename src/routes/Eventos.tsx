import { CalendarDays } from 'lucide-react'
import EventsCarousel from '../components/events/EventsCarousel'
import GlowCard from '../components/shared/GlowCard'
import SectionTitle from '../components/shared/SectionTitle'
import { placeholderEvents } from '../data/placeholderEvents'

export default function Eventos() {
  const publishedEvents = placeholderEvents.filter((event) => event.isPublished)

  return (
    <section className="py-20">
      <div className="onda-container">
        <SectionTitle
          eyebrow="Eventos"
          title="Cartelera ONDA"
          subtitle="Fechas y experiencias oficiales de ONDA MULTIMEDIA."
        />

        {publishedEvents.length > 0 ? (
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
                Pronto anunciaremos nuevas fechas.
              </h3>
            </div>
          </GlowCard>
        )}
      </div>
    </section>
  )
}
