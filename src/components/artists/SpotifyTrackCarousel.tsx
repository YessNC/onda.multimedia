import { FreeMode } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'
import 'swiper/css/free-mode'
import type { SpotifyTrack } from '../../data/artists'
import SpotifyTrackCard from './SpotifyTrackCard'

type SpotifyTrackCarouselProps = {
  tracks: SpotifyTrack[]
}

export default function SpotifyTrackCarousel({ tracks }: SpotifyTrackCarouselProps) {
  return (
    <Swiper
      modules={[FreeMode]}
      freeMode
      spaceBetween={16}
      slidesPerView={1.12}
      breakpoints={{
        640: { slidesPerView: 2.1 },
        1024: { slidesPerView: 3 },
      }}
    >
      {tracks.map((track) => (
        <SwiperSlide key={track.title}>
          <SpotifyTrackCard track={track} />
        </SwiperSlide>
      ))}
    </Swiper>
  )
}
