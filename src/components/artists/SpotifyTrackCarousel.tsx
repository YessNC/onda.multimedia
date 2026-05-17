import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Swiper as SwiperInstance } from 'swiper'
import { FreeMode, Mousewheel } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'
import 'swiper/css/free-mode'
import type { Artist, Track } from '../../data/artists'
import SpotifyTrackCard from './SpotifyTrackCard'

type SpotifyTrackCarouselProps = {
  artist: Artist
  tracks: Track[]
}

type SpotifyCarouselControlsProps = {
  direction: 'next' | 'prev'
  isVisible: boolean
  swiper: SwiperInstance | null
}

function SpotifyCarouselControl({ direction, isVisible, swiper }: SpotifyCarouselControlsProps) {
  const [isBeginning, setIsBeginning] = useState(true)
  const [isEnd, setIsEnd] = useState(false)

  useEffect(() => {
    if (!swiper) {
      return undefined
    }

    const updateState = () => {
      setIsBeginning(swiper.isBeginning)
      setIsEnd(swiper.isEnd)
    }

    updateState()
    swiper.on('slideChange', updateState)
    swiper.on('reachBeginning', updateState)
    swiper.on('reachEnd', updateState)
    swiper.on('fromEdge', updateState)
    swiper.on('resize', updateState)

    return () => {
      swiper.off('slideChange', updateState)
      swiper.off('reachBeginning', updateState)
      swiper.off('reachEnd', updateState)
      swiper.off('fromEdge', updateState)
      swiper.off('resize', updateState)
    }
  }, [swiper])

  if (!isVisible || !swiper) {
    return null
  }

  const isNext = direction === 'next'
  const isDisabled = isNext ? isEnd : isBeginning
  const label = isNext ? 'Mas canciones' : 'Canciones anteriores'
  const Icon = isNext ? ChevronRight : ChevronLeft

  return (
    <button
      type="button"
      onClick={() => (isNext ? swiper.slideNext() : swiper.slidePrev())}
      disabled={isDisabled}
      aria-label={label}
      className="inline-flex h-10 w-10 items-center justify-center justify-self-center rounded-full border border-onda-purple/25 bg-white/88 text-onda-purple shadow-[0_14px_40px_rgba(123,44,255,0.2)] backdrop-blur-xl transition hover:border-onda-purple hover:bg-onda-purple hover:text-white disabled:pointer-events-none disabled:opacity-35 dark:border-onda-lavender/30 dark:bg-onda-black/82 dark:text-onda-lavender dark:hover:bg-onda-purple dark:hover:text-white"
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </button>
  )
}

export default function SpotifyTrackCarousel({ artist, tracks }: SpotifyTrackCarouselProps) {
  const safeTracks = Array.isArray(tracks) ? tracks : []
  const [swiper, setSwiper] = useState<SwiperInstance | null>(null)
  const hasControls = safeTracks.length > 1

  if (safeTracks.length === 0) {
    return null
  }

  return (
    <div
      className={
        hasControls
          ? 'grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-2 sm:grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] sm:gap-3'
          : 'min-w-0'
      }
    >
      <SpotifyCarouselControl direction="prev" isVisible={hasControls} swiper={swiper} />
      <div className="min-w-0">
        <Swiper
          modules={[FreeMode, Mousewheel]}
          freeMode
          grabCursor
          mousewheel={{ forceToAxis: true, releaseOnEdges: true }}
          onSwiper={setSwiper}
          spaceBetween={18}
          slidesPerView={1.02}
          breakpoints={{
            720: { slidesPerView: 1.5 },
            1024: { slidesPerView: 2.18 },
            1440: { slidesPerView: 2.28 },
          }}
          className="w-full min-w-0 pb-2"
        >
          {safeTracks.map((track) => (
            <SwiperSlide key={track.id}>
              <SpotifyTrackCard artist={artist} track={track} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
      <SpotifyCarouselControl direction="next" isVisible={hasControls} swiper={swiper} />
    </div>
  )
}
