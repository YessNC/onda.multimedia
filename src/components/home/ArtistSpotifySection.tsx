import ArtistTabs from '../artists/ArtistTabs'
import SectionTitle from '../shared/SectionTitle'

export default function ArtistSpotifySection() {
  return (
    <section className="relative overflow-hidden py-20">
      <div className="pointer-events-none absolute inset-x-0 top-12 h-px bg-gradient-to-r from-transparent via-onda-purple/40 to-transparent" />
      <div className="onda-container">
        <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <SectionTitle
            eyebrow="Artistas"
            title="Nuestros artistas"
            subtitle="Canciones destacadas, perfiles oficiales y presencia urbana conectada con Spotify desde una experiencia propia de ONDA MULTIMEDIA."
          />
        </div>
        <ArtistTabs />
      </div>
    </section>
  )
}
