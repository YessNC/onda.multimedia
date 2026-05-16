import { Camera, Mail, MapPin, MessageCircle } from 'lucide-react'
import CTAButton from '../components/shared/CTAButton'
import GlowCard from '../components/shared/GlowCard'
import SectionTitle from '../components/shared/SectionTitle'
import { whatsappQuoteUrl } from '../lib/utils'

const contactItems = [
  { label: 'WhatsApp', value: 'Cotizaciones y proyectos', icon: MessageCircle },
  { label: 'Instagram', value: 'Contenido y novedades', icon: Camera },
  { label: 'Email', value: 'hola@ondamultimedia.cl', icon: Mail },
  { label: 'Freirina, Chile', value: 'Casa matriz', icon: MapPin },
]

export default function Contacto() {
  return (
    <section className="py-20">
      <div className="onda-container">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <SectionTitle
              eyebrow="Contacto"
              title="Hablemos de tu proximo proyecto"
              subtitle="Formulario y canales definitivos quedaran conectados en una etapa posterior. Por ahora el flujo principal apunta a WhatsApp."
            />
            <div className="mt-8">
              <CTAButton href={whatsappQuoteUrl} target="_blank" rel="noreferrer">
                Cotizar por WhatsApp
              </CTAButton>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {contactItems.map((item, index) => {
              const Icon = item.icon

              return (
                <GlowCard key={item.label} delay={index * 0.08}>
                  <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-md bg-onda-purple/10 text-onda-purple dark:bg-onda-purple/20 dark:text-onda-lavender">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-sm font-bold uppercase tracking-[0.16em] text-zinc-950 dark:text-white">
                    {item.label}
                  </h3>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-onda-muted">{item.value}</p>
                </GlowCard>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
