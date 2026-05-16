import ArtistSpotifySection from '../components/home/ArtistSpotifySection'
import CasaMatrizSection from '../components/home/CasaMatrizSection'
import EventsPreviewSection from '../components/home/EventsPreviewSection'
import HeroSlider from '../components/home/HeroSlider'

export default function Home() {
  return (
    <>
      <HeroSlider />
      <CasaMatrizSection />
      <ArtistSpotifySection />
      <EventsPreviewSection />
    </>
  )
}
