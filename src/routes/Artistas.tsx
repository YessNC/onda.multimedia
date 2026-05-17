import { useI18n } from '../hooks/useI18n'
import ArtistTabs from '../components/artists/ArtistTabs'
import SectionTitle from '../components/shared/SectionTitle'

export default function Artistas() {
  const { t } = useI18n()

  return (
    <section className="py-20">
      <div className="onda-container">
        <div className="mb-10">
          <SectionTitle
            eyebrow={t('artistas.eyebrow')}
            title={t('artistas.title')}
            subtitle={t('artistas.description')}
          />
        </div>
        <ArtistTabs />
      </div>
    </section>
  )
}
