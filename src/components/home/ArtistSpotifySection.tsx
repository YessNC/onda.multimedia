import ArtistTabs from '../artists/ArtistTabs'
import SectionTitle from '../shared/SectionTitle'

export default function ArtistSpotifySection() {
  return (
    <section className="py-20">
      <div className="onda-container">
        <SectionTitle
          eyebrow="Artistas"
          title="Roster urbano listo para crecer"
          subtitle="La estructura queda preparada para conectar musica, campañas y perfiles oficiales sin implementar todavia integraciones reales."
        />
        <div className="mt-10">
          <ArtistTabs />
        </div>
      </div>
    </section>
  )
}
