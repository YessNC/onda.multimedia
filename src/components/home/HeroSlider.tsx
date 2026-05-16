import { Autoplay, EffectFade, Pagination } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'
import 'swiper/css/effect-fade'
import 'swiper/css/pagination'
import { useTheme } from '../../lib/theme'
import HeroSlide from './HeroSlide'

const slides = [
  {
    eyebrow: 'Eventos · Audiovisual · Musica',
    title: 'Frecuencia multimedia para escenarios reales',
    description:
      'Una base premium para producir experiencias, contenido y artistas urbanos con una identidad visual nocturna, tecnologica y lista para escalar.',
  },
  {
    eyebrow: 'Casa Matriz Freirina',
    title: 'Produccion con pulso urbano y vision nacional',
    description:
      'ONDA MULTIMEDIA nace desde Freirina con foco en eventos, sonido, visuales, desarrollo musical y representacion artistica.',
  },
]

export default function HeroSlider() {
  const { theme } = useTheme()
  const heroImage = theme === 'dark' ? '/assets/hero/onda-hero-bg-night.png' : '/assets/hero/onda-hero-bg-day.png'

  return (
    <Swiper
      modules={[Autoplay, EffectFade, Pagination]}
      effect="fade"
      loop
      pagination={{ clickable: true }}
      autoplay={{ delay: 6200, disableOnInteraction: false }}
      className="onda-hero-swiper"
    >
      {slides.map((slide) => (
        <SwiperSlide key={slide.title}>
          <HeroSlide {...slide} image={heroImage} />
        </SwiperSlide>
      ))}
    </Swiper>
  )
}
