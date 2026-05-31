import { ArrowRight } from 'lucide-react'
import EventsCarousel from '../events/EventsCarousel'
import CTAButton from '../shared/CTAButton'
import SectionTitle from '../shared/SectionTitle'
import { useI18n } from '../../hooks/useI18n'
import { usePublicEvents } from '../../hooks/usePublicEvents'

export default function EventsPreviewSection() {
  const { t } = useI18n()
  const { events: publishedEvents, isLoading } = usePublicEvents(6)

  if (isLoading || publishedEvents.length === 0) {
    return null
  }

  return (
    <section className="relative overflow-hidden py-20 sm:py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-onda-purple/45 to-transparent"
      />
      <div className="onda-container">
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionTitle
            eyebrow={t('events-preview.eyebrow')}
            title={t('events-preview.title')}
            subtitle={t('events-preview.description')}
          />
          <CTAButton to="/eventos" variant="secondary" icon={<ArrowRight className="h-4 w-4" />} className="sm:mb-1">
            {t('events-preview.cta')}
          </CTAButton>
        </div>
        <EventsCarousel events={publishedEvents} />
      </div>
    </section>
  )
}
