import ArtistTabs from '../components/artists/ArtistTabs'
import SectionTitle from '../components/shared/SectionTitle'

export default function Artistas() {
  return (
    <section className="py-20">
      <div className="onda-container">
        <div className="mb-10">
          <SectionTitle
            eyebrow="Roster"
            title="Nuestros artistas"
            subtitle="Perfiles oficiales, canciones destacadas y conexion directa con Spotify para el universo musical de ONDA MULTIMEDIA."
          />
        </div>
        <ArtistTabs />
      </div>
    </section>
  )
}
