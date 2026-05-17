import { ArrowRight } from 'lucide-react'
import { placeholderEvents } from '../../data/placeholderEvents'
import EventsCarousel from '../events/EventsCarousel'
import CTAButton from '../shared/CTAButton'
import SectionTitle from '../shared/SectionTitle'

export default function EventsPreviewSection() {
  const publishedEvents = placeholderEvents.filter((event) => event.isPublished)

  if (publishedEvents.length === 0) {
    return null
  }

  return (
    <section className="py-20">
      <div className="onda-container">
        <div className="rounded-[2rem] border border-white/20 bg-white/80 p-8 shadow-[0_30px_80px_rgba(123,44,255,0.08)] backdrop-blur-3xl dark:border-onda-purple/20 dark:bg-onda-black/70 dark:shadow-[0_30px_90px_rgba(123,44,255,0.2)]">
          <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <SectionTitle
              eyebrow="Eventos"
              title="Cartelera preparada"
              subtitle="Una primera vista para futuros eventos, registros y llamados a cotizacion."
            />
            <CTAButton to="/eventos" variant="secondary" icon={<ArrowRight className="h-4 w-4" />} className="sm:mb-1">
              Ver cartelera
            </CTAButton>
          </div>
          <EventsCarousel events={publishedEvents} />
        </div>
      </div>
    </section>
  )
}
