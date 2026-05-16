import { ArrowRight } from 'lucide-react'
import CTAButton from '../shared/CTAButton'
import SectionTitle from '../shared/SectionTitle'

export default function ServicesHero() {
  return (
    <section className="relative overflow-hidden py-20">
      <div className="absolute inset-0 tech-grid opacity-70" />
      <div className="onda-container relative">
        <div className="max-w-4xl">
          <SectionTitle
            eyebrow="Servicios"
            title="Produccion integral para cultura urbana"
            subtitle="Eventos, audiovisual, musica y representacion conectados bajo una identidad premium y tecnologica."
          />
          <div className="mt-8">
            <CTAButton to="/contacto" icon={<ArrowRight className="h-4 w-4" />}>
              Cotiza tu proyecto
            </CTAButton>
          </div>
        </div>
      </div>
    </section>
  )
}
