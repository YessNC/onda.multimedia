import { Autoplay, Keyboard, Mousewheel, Pagination } from 'swiper/modules'
import { Swiper, SwiperSlide, useSwiper } from 'swiper/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import 'swiper/css'
import 'swiper/css/pagination'
import HeroSlide, { type HeroSlideData } from './HeroSlide'
import { useI18n } from '../../hooks/useI18n'
import { useRef } from 'react'

const slides: HeroSlideData[] = [
  {
    kind: 'brand',
  },
  {
    kind: 'artist',
    nameKey: 'hero.vektorben',
    backgroundImage: '/assets/artists/vektorben-web.webp',
    backgroundPosition: 'center top',
  },
  {
    kind: 'artist',
    nameKey: 'hero.nueva-frecuencia',
    taglineKey: 'hero.next-cover',
    accent:
      'radial-gradient(circle at 22% 28%, rgba(168,85,247,0.34), transparent 24%), radial-gradient(circle at 78% 70%, rgba(36,36,48,0.9), transparent 34%), linear-gradient(135deg, #050505 0%, #17101f 58%, #050505 100%)',
  },
  {
    kind: 'artist',
    nameKey: 'hero.onda-session',
    taglineKey: 'hero.audio-launches',
    accent:
      'radial-gradient(circle at 24% 68%, rgba(123,44,255,0.34), transparent 26%), radial-gradient(circle at 82% 25%, rgba(192,132,252,0.2), transparent 30%), linear-gradient(135deg, #07070a 0%, #101018 62%, #050505 100%)',
  },
  {
    kind: 'artist',
    nameKey: 'hero.guest-artist',
    taglineKey: 'hero.next-cover-placeholder',
    accent:
      'radial-gradient(circle at 18% 30%, rgba(255,255,255,0.12), transparent 22%), radial-gradient(circle at 78% 74%, rgba(168,85,247,0.28), transparent 30%), linear-gradient(135deg, #050505 0%, #12111a 52%, #08050d 100%)',
  },
]

function HeroSliderControls() {
  const { t } = useI18n()
  const swiper = useSwiper()

  return (
    <div className="pointer-events-none absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-3 md:flex lg:right-8">
      <button
        type="button"
        aria-label={t('hero.prev-slide')}
        onClick={() => swiper.slidePrev()}
        className="hero-slider-control pointer-events-auto"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label={t('hero.next-slide')}
        onClick={() => swiper.slideNext()}
        className="hero-slider-control pointer-events-auto"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  )
}

export default function HeroSlider() {
  const { t } = useI18n()
  const autoplayResumeRef = useRef<number | null>(null)

  return (
    <section className="relative overflow-hidden" aria-label={t('hero.highlights')}>
      <Swiper
        modules={[Autoplay, Keyboard, Mousewheel, Pagination]}
        loop
        autoplay={{ delay: 7200, disableOnInteraction: false, pauseOnMouseEnter: true }}
        grabCursor
        keyboard={{ enabled: true }}
        mousewheel={{ forceToAxis: true, releaseOnEdges: true, sensitivity: 0.7 }}
        pagination={{ clickable: true }}
        resistanceRatio={0.78}
        simulateTouch
        speed={850}
        threshold={8}
        touchRatio={1}
        onSlideChange={(swiper) => {
          try {
            if (typeof window !== 'undefined' && window.innerWidth <= 768) {
              if (swiper.autoplay) {
                swiper.autoplay.stop()
                // clear previous timer if any
                if (autoplayResumeRef.current) window.clearTimeout(autoplayResumeRef.current)
                autoplayResumeRef.current = window.setTimeout(() => {
                  try {
                    swiper.autoplay.start()
                  } catch (e) {
                    // ignore
                  }
                  autoplayResumeRef.current = null
                }, 900)
              }
            }
          } catch (e) {
            // ignore
          }
        }}
        className="onda-hero-swiper"
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={slide.kind === 'brand' ? 'onda-brand' : `${slide.name}-${index}`}>
            <HeroSlide slide={slide} />
          </SwiperSlide>
        ))}
        <HeroSliderControls />
      </Swiper>
    </section>
  )
}
