import { ArrowRight } from 'lucide-react'
import EventsCarousel from '../events/EventsCarousel'
import CTAButton from '../shared/CTAButton'
import SectionTitle from '../shared/SectionTitle'

export default function EventsPreviewSection() {
  return (
    <section className="py-20">
      <div className="onda-container">
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
        <EventsCarousel />
      </div>
    </section>
  )
}
