import { Mic2 } from 'lucide-react'
import { artists } from '../../data/artists'
import { useI18n } from '../../hooks/useI18n'
import GlowCard from '../shared/GlowCard'
import SectionTitle from '../shared/SectionTitle'

export default function ArtistRepresentationSection() {
  const { t } = useI18n()

  return (
    <section className="pb-20">
      <div className="onda-container">
        <SectionTitle
          eyebrow={t('representation.eyebrow')}
          title={t('representation.title')}
          subtitle={t('representation.description')}
        />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {artists.map((artist, index) => (
            <GlowCard key={artist.id} delay={index * 0.08}>
              <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-md bg-onda-purple/10 text-onda-purple dark:bg-onda-purple/20 dark:text-onda-lavender">
                <Mic2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="font-display text-lg font-bold uppercase tracking-[0.15em] text-zinc-950 dark:text-white">
                {artist.name}
              </h3>
              <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-onda-muted">{t(artist.heroPhraseKey)}</p>
            </GlowCard>
          ))}
        </div>
      </div>
    </section>
  )
}
