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
    <section className="py-20">
      <div className="onda-container">
        <div className="rounded-[2rem] border border-white/20 bg-white/80 p-8 shadow-[0_30px_80px_rgba(123,44,255,0.08)] backdrop-blur-3xl dark:border-onda-purple/20 dark:bg-onda-black/70 dark:shadow-[0_30px_90px_rgba(123,44,255,0.2)]">
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
      </div>
    </section>
  )
}
