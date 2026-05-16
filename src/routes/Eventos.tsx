import EventScratchCard from '../components/events/EventScratchCard'
import EventsCarousel from '../components/events/EventsCarousel'
import SectionTitle from '../components/shared/SectionTitle'

export default function Eventos() {
  return (
    <section className="py-20">
      <div className="onda-container">
        <SectionTitle
          eyebrow="Eventos"
          title="Cartelera ONDA"
          subtitle="Ruta inicial para listar eventos, activar dinamicas y conectar administracion cuando la base de datos este lista."
        />
        <div className="mt-10">
          <EventsCarousel />
        </div>
        <EventScratchCard />
      </div>
    </section>
  )
}
