import { Camera, Mail, MapPin, MessageCircle } from 'lucide-react'
import { useI18n } from '../hooks/useI18n'
import CTAButton from '../components/shared/CTAButton'
import GlowCard from '../components/shared/GlowCard'
import SectionTitle from '../components/shared/SectionTitle'
import { whatsappQuoteUrl } from '../lib/utils'

export default function Contacto() {
  const { t } = useI18n()

  const contactItems = [
    { labelKey: 'contact.whatsapp-desc', labelTitle: t('footer.whatsapp'), icon: MessageCircle },
    { labelKey: 'contact.instagram-desc', labelTitle: t('footer.instagram'), icon: Camera },
    { labelKey: 'contact.email-desc', labelTitle: t('footer.email'), icon: Mail },
    { labelKey: 'contact.location-desc', labelTitle: 'Freirina, Chile', icon: MapPin },
  ]

  return (
    <section className="py-20">
      <div className="onda-container">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <SectionTitle
              eyebrow={t('contact.eyebrow')}
              title={t('contact.title')}
              subtitle={t('contact.description')}
            />
            <div className="mt-8">
              <CTAButton href={whatsappQuoteUrl} target="_blank" rel="noreferrer">
                {t('contact.cta')}
              </CTAButton>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {contactItems.map((item, index) => {
              const Icon = item.icon

              return (
                <GlowCard key={item.labelTitle} delay={index * 0.08}>
                  <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-md bg-onda-purple/10 text-onda-purple dark:bg-onda-purple/20 dark:text-onda-lavender">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-sm font-bold uppercase tracking-[0.16em] text-zinc-950 dark:text-white">
                    {item.labelTitle}
                  </h3>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-onda-muted">{t(item.labelKey)}</p>
                </GlowCard>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
