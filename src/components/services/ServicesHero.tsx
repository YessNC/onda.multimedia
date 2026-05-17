import { ArrowRight } from 'lucide-react'
import CTAButton from '../shared/CTAButton'
import SectionTitle from '../shared/SectionTitle'
import { useI18n } from '../../hooks/useI18n'

export default function ServicesHero() {
  const { t } = useI18n()
  return (
    <section className="relative overflow-hidden py-20">
      <div className="absolute inset-0 tech-grid opacity-70" />
      <div className="onda-container relative">
        <div className="max-w-4xl">
          <SectionTitle
            eyebrow={t('services.eyebrow')}
            title={t('services.hero-title')}
            subtitle={t('services.hero-description')}
          />
          <div className="mt-8">
            <CTAButton to="/contacto" icon={<ArrowRight className="h-4 w-4" />}>
              {t('services.hero-cta')}
            </CTAButton>
          </div>
        </div>
      </div>
    </section>
  )
}
