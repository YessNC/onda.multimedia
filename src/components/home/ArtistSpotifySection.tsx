import ArtistTabs from '../artists/ArtistTabs'
import SectionTitle from '../shared/SectionTitle'

export default function ArtistSpotifySection() {
  return (
    <section className="py-20">
      <div className="onda-container">
        <div className="rounded-[2rem] border border-white/20 bg-white/80 p-8 shadow-[0_30px_80px_rgba(123,44,255,0.08)] backdrop-blur-3xl dark:border-onda-purple/20 dark:bg-onda-black/70 dark:shadow-[0_30px_90px_rgba(123,44,255,0.2)]">
          <SectionTitle
            eyebrow="Artistas"
            title="Roster urbano listo para crecer"
            subtitle="La estructura queda preparada para conectar musica, campañas y perfiles oficiales sin implementar todavia integraciones reales."
          />
          <div className="mt-10">
            <ArtistTabs />
          </div>
        </div>
      </div>
    </section>
  )
}
