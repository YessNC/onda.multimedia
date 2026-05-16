import { motion } from 'framer-motion'
import { ArrowDown, ArrowRight, Calendar, Music, Play, User } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../../lib/theme'
import { cn } from '../../lib/utils'

const logoSrc = '/assets/brand/logo-onda.png'
const robotDaySrc = '/assets/brand/robot-day.png'
const robotNightSrc = '/assets/brand/robot-night.png'

type BrandHeroSlide = {
  kind: 'brand'
}

type ArtistHeroSlide = {
  accent?: string
  backgroundImage?: string
  backgroundPosition?: string
  kind: 'artist'
  name: string
  tagline: string
}

export type HeroSlideData = BrandHeroSlide | ArtistHeroSlide

type HeroSlideProps = {
  slide: HeroSlideData
}

type HeroGlassButtonProps = {
  children: ReactNode
  className?: string
  href?: string
  icon?: ReactNode
  to?: string
  variant?: 'primary' | 'secondary'
}

function useRobotAsset() {
  const { theme } = useTheme()
  const desiredSrc = theme === 'dark' ? robotNightSrc : robotDaySrc
  const [failedSrcs, setFailedSrcs] = useState<string[]>([])
  const src = failedSrcs.includes(desiredSrc) ? robotDaySrc : desiredSrc

  return {
    isMissing: failedSrcs.includes(src),
    src,
    onError: () => {
      setFailedSrcs((current) => (current.includes(src) ? current : [...current, src]))
    },
  }
}

function HeroGlassButton({ children, className, href, icon, to, variant = 'secondary' }: HeroGlassButtonProps) {
  const buttonClassName = cn(
    'hero-glass-button',
    variant === 'primary' ? 'hero-glass-button-primary' : 'hero-glass-button-secondary',
    className,
  )
  const content = (
    <>
      {icon}
      <span>{children}</span>
    </>
  )

  if (to) {
    return (
      <Link to={to} className={buttonClassName}>
        {content}
      </Link>
    )
  }

  return (
    <a href={href ?? '#'} className={buttonClassName}>
      {content}
    </a>
  )
}

function HeroAtmosphere() {
  const waveBars = [36, 58, 84, 118, 156, 122, 88, 64, 42]
  const particles = Array.from({ length: 16 }, (_, index) => index)

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(168,85,247,0.34),transparent_24%),radial-gradient(circle_at_14%_78%,rgba(123,44,255,0.28),transparent_26%),linear-gradient(180deg,#050505_0%,#10071a_48%,#050505_100%)] dark:bg-[radial-gradient(circle_at_50%_24%,rgba(168,85,247,0.32),transparent_25%),radial-gradient(circle_at_15%_80%,rgba(123,44,255,0.28),transparent_27%),linear-gradient(180deg,#050505_0%,#0b0b12_54%,#050505_100%)]" />
      <div className="absolute inset-0 opacity-[0.28] mix-blend-screen tech-grid dark:opacity-[0.28]" />
      <div className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/[0.03] blur-[1px] backdrop-blur-3xl dark:border-white/10" />
      <div className="absolute left-1/2 top-1/2 h-[44rem] w-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-onda-lavender/10 opacity-60" />
      <div className="absolute left-1/2 top-[47%] hidden -translate-x-1/2 items-center gap-3 opacity-50 md:flex">
        {waveBars.map((height, index) => (
          <motion.span
            key={`${height}-${index}`}
            className="w-1 rounded-full bg-onda-purple/45 shadow-[0_0_18px_rgba(168,85,247,0.38)] dark:bg-onda-lavender/50"
            style={{ height }}
            animate={{ scaleY: [0.72, 1, 0.82] }}
            transition={{ duration: 2 + index * 0.08, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>
      <div className="absolute inset-x-[8%] top-[22%] h-px bg-gradient-to-r from-transparent via-onda-purple/35 to-transparent dark:via-onda-lavender/35" />
      <div className="absolute inset-x-[14%] bottom-[22%] h-px bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-onda-purple/35" />
      {particles.map((particle) => (
        <motion.span
          key={particle}
          className="absolute h-1 w-1 rounded-full bg-onda-purple/35 shadow-[0_0_14px_rgba(168,85,247,0.7)] dark:bg-onda-lavender/45"
          style={{
            left: `${8 + ((particle * 17) % 84)}%`,
            top: `${14 + ((particle * 29) % 72)}%`,
          }}
          animate={{ opacity: [0.18, 0.8, 0.24], scale: [0.75, 1.25, 0.75] }}
          transition={{ duration: 3.2 + particle * 0.08, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

function SwipeIndicator() {
  return (
    <motion.div
      aria-hidden="true"
      className="mt-8 flex flex-col items-center gap-2 text-onda-purple dark:text-onda-lavender"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.65, duration: 0.55 }}
    >
      <div className="relative flex h-10 w-6 items-start justify-center rounded-full border border-onda-purple/35 bg-white/20 p-1 shadow-[0_0_24px_rgba(123,44,255,0.18)] backdrop-blur-xl dark:border-white/20 dark:bg-white/5">
        <motion.span
          className="h-2 w-1 rounded-full bg-onda-purple dark:bg-onda-lavender"
          animate={{ y: [0, 18, 0], opacity: [0.95, 0.25, 0.95] }}
          transition={{ duration: 1.55, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      <motion.div animate={{ y: [0, 5, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}>
        <ArrowDown className="h-4 w-4" />
      </motion.div>
    </motion.div>
  )
}

function BrandSlide() {
  const robot = useRobotAsset()

  return (
    <section className="relative min-h-[76svh] overflow-hidden px-4 sm:px-6 lg:min-h-[82vh] lg:px-8">
      <HeroAtmosphere />
      <div className="onda-container relative z-10 flex min-h-[76svh] items-center justify-center py-10 sm:py-12 lg:min-h-[82vh]">
        <motion.div
          className="relative isolate flex w-full max-w-6xl flex-col items-center justify-center text-center"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: 'easeOut' }}
        >
          <div className="absolute left-1/2 top-[45%] h-[min(74vw,34rem)] w-[min(74vw,34rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-onda-lavender/15 bg-white/[0.04] shadow-[0_0_120px_rgba(168,85,247,0.2)] backdrop-blur-xl" />
          <div className="absolute left-1/2 top-[45%] h-[min(86vw,44rem)] w-[min(86vw,44rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-onda-lavender/15 opacity-80" />

          {!robot.isMissing ? (
            <motion.img
              src={robot.src}
              alt="Robot ONDA Multimedia"
              className="pointer-events-none absolute right-2 top-[48%] z-0 h-24 w-24 object-contain drop-shadow-[0_28px_70px_rgba(123,44,255,0.28)] sm:bottom-10 sm:right-6 sm:top-auto sm:h-56 sm:w-56 md:h-64 md:w-64 lg:bottom-0 lg:right-12 lg:h-80 lg:w-80"
              onError={robot.onError}
              initial={{ opacity: 0, x: 34, rotate: 4 }}
              animate={{ opacity: 1, x: 0, rotate: 0, y: [0, -10, 0] }}
              transition={{
                opacity: { duration: 0.8, delay: 0.22 },
                x: { duration: 0.8, delay: 0.22 },
                rotate: { duration: 0.8, delay: 0.22 },
                y: { duration: 5.5, repeat: Infinity, ease: 'easeInOut' },
              }}
            />
          ) : null}

          <motion.div
            className="relative z-10 mx-auto flex min-h-[13rem] w-full max-w-[21rem] items-center justify-center rounded-lg border border-white/18 bg-black/22 px-6 py-8 shadow-[0_36px_140px_rgba(168,85,247,0.24)] backdrop-blur-2xl sm:min-h-[18rem] sm:max-w-[720px] sm:px-12 sm:py-10"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          >
            <span className="pointer-events-none absolute inset-0 rounded-lg bg-[linear-gradient(130deg,rgba(255,255,255,0.22),transparent_36%,rgba(168,85,247,0.14))]" />
            <span className="pointer-events-none absolute -inset-px rounded-lg border border-onda-purple/20 blur-[1px] dark:border-onda-lavender/25" />
            <img
              src={logoSrc}
              alt="ONDA MULTIMEDIA"
              className="relative z-10 mx-auto w-full max-w-[18rem] object-contain drop-shadow-[0_0_32px_rgba(123,44,255,0.3)] sm:max-w-[580px]"
            />
          </motion.div>

          <motion.div
            className="relative z-20 mt-7 flex w-full flex-col items-center justify-center gap-3 sm:mt-8 sm:flex-row"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.28 }}
          >
            <HeroGlassButton to="/servicios" icon={<ArrowRight className="h-4 w-4" />} variant="primary">
              Ver servicios
            </HeroGlassButton>
            <HeroGlassButton to="/eventos" icon={<Calendar className="h-4 w-4" />}>
              Ver eventos
            </HeroGlassButton>
          </motion.div>

          <SwipeIndicator />
        </motion.div>
      </div>
    </section>
  )
}

function ArtistSlide({ slide }: { slide: ArtistHeroSlide }) {
  const hasImage = Boolean(slide.backgroundImage)
  const fallbackBackground =
    slide.accent ??
    'radial-gradient(circle at 20% 25%, rgba(168,85,247,0.32), transparent 24%), radial-gradient(circle at 80% 70%, rgba(123,44,255,0.28), transparent 24%), linear-gradient(135deg, #050505 0%, #121018 55%, #050505 100%)'

  return (
    <section className="relative min-h-[76svh] overflow-hidden px-4 text-white sm:px-6 lg:min-h-[82vh] lg:px-8">
      {hasImage ? (
        <div
          className="absolute inset-0 scale-[1.01] bg-cover bg-center"
          style={{
            backgroundImage: `url(${slide.backgroundImage})`,
            backgroundPosition: slide.backgroundPosition ?? 'center',
          }}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: fallbackBackground }} />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,5,5,0.82)_0%,rgba(5,5,5,0.42)_42%,rgba(5,5,5,0.68)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_50%,rgba(168,85,247,0.18),transparent_34%),linear-gradient(180deg,rgba(5,5,5,0.16)_0%,rgba(5,5,5,0.66)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/45 to-transparent" />

      <div className="onda-container relative z-10 flex min-h-[76svh] items-end py-16 sm:items-center lg:min-h-[82vh]">
        <motion.div
          className="max-w-xl rounded-lg border border-white/18 bg-black/28 p-5 shadow-[0_26px_100px_rgba(123,44,255,0.22)] backdrop-blur-2xl sm:p-6"
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.72, ease: 'easeOut' }}
        >
          <h2 className="font-display text-4xl font-black uppercase leading-none text-white drop-shadow-[0_0_28px_rgba(168,85,247,0.35)] sm:text-5xl lg:text-6xl">
            {slide.name}
          </h2>
          <p className="mt-3 max-w-md text-sm font-medium text-white/78 sm:text-base">{slide.tagline}</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <HeroGlassButton href="#" icon={<User className="h-4 w-4" />} className="w-full">
              Ver artista
            </HeroGlassButton>
            <HeroGlassButton href="#" icon={<Play className="h-4 w-4" />} className="w-full">
              Escuchar en YouTube
            </HeroGlassButton>
            <HeroGlassButton href="#" icon={<Music className="h-4 w-4" />} className="w-full">
              Escuchar en Spotify
            </HeroGlassButton>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default function HeroSlide({ slide }: HeroSlideProps) {
  if (slide.kind === 'brand') {
    return <BrandSlide />
  }

  return <ArtistSlide slide={slide} />
}
