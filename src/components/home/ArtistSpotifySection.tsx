import ArtistTabs from '../artists/ArtistTabs'
import SectionTitle from '../shared/SectionTitle'
import { useI18n } from '../../hooks/useI18n'

export default function ArtistSpotifySection() {
  const { t } = useI18n()
  return (
    <section className="relative overflow-hidden py-20">
      <div className="pointer-events-none absolute inset-x-0 top-12 h-px bg-gradient-to-r from-transparent via-onda-purple/40 to-transparent" />
      <div className="onda-container">
        <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <SectionTitle
            eyebrow={t('artists.eyebrow')}
            title={t('artists.title')}
            subtitle={t('artists.description')}
          />
        </div>
        <ArtistTabs />
      </div>
    </section>
  )
}
