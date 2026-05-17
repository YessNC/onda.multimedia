import { motion } from 'framer-motion'
import { ArrowDown, ArrowRight, Calendar, Music, Play, User } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useBrandLogoAsset } from '../../lib/brandAssets'
import { useTheme } from '../../lib/theme'
import { cn } from '../../lib/utils'
import { useI18n } from '../../hooks/useI18n'

const robotDaySrc = '/assets/brand/robot-day.png'
const robotNightSrc = '/assets/brand/robot-night.png'
const vektorbenSpotifyUrl = 'https://open.spotify.com/intl-es/artist/60f1mSGeUUhevHXVgZpAii?si=diUtB478Sb20GNgTdbMysA'
const vektorbenInstagramUrl = 'https://www.instagram.com/vektorbenlavision/'

type BrandHeroSlide = {
  kind: 'brand'
}

type ArtistHeroSlide = {
  accent?: string
  backgroundImage?: string
  backgroundPosition?: string
  kind: 'artist'
  name: string
  tagline?: string
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

function SpotifyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="currentColor">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.59 14.42a.69.69 0 0 1-.95.23c-2.6-1.59-5.88-1.95-9.74-1.07a.69.69 0 1 1-.3-1.35c4.22-.96 7.84-.54 10.76 1.25.32.19.43.62.23.94Zm1.22-2.72a.86.86 0 0 1-1.18.28c-2.98-1.83-7.51-2.36-11.03-1.29a.86.86 0 1 1-.5-1.65c4.02-1.22 9.02-.63 12.43 1.46.4.25.53.78.28 1.2Zm.1-2.83C14.34 8.75 8.45 8.55 5.04 9.59a1.03 1.03 0 1 1-.6-1.97c3.92-1.19 10.43-.96 14.52 1.46a1.03 1.03 0 0 1-1.05 1.79Z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none">
      <rect width="16" height="16" x="4" y="4" rx="4.4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16.7" cy="7.35" r="1" fill="currentColor" />
    </svg>
  )
}

function VektorbenSocialLink({ children, href, label }: { children: ReactNode; href: string; label: string }) {
  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/18 bg-white/10 text-white shadow-[0_0_22px_rgba(123,44,255,0.18)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-onda-lavender/70 hover:bg-onda-purple/22 hover:shadow-[0_0_32px_rgba(168,85,247,0.38)]"
    >
      {children}
    </a>
  )
}

function HeroAtmosphere() {
  const waveBars = [28, 48, 72, 106, 136, 108, 74, 52, 34, 58, 92, 120, 82, 46, 30]
  const particles = Array.from({ length: 16 }, (_, index) => index)

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#7b2cff_0%,#b795ff_30%,#f3edff_66%,#ffffff_100%)] dark:bg-[linear-gradient(180deg,#050505_0%,#11071e_48%,#050505_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.5)_48%,rgba(255,255,255,0.96)_100%)] dark:bg-[linear-gradient(90deg,rgba(5,5,5,0.82)_0%,rgba(20,6,39,0.72)_50%,rgba(5,5,5,0.76)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.38)_0%,rgba(255,255,255,0.06)_42%,rgba(123,44,255,0.08)_62%,rgba(255,255,255,0.42)_100%)] dark:hidden" />
      <div className="absolute inset-0 opacity-[0.2] mix-blend-screen tech-grid dark:opacity-[0.24]" />
      <div className="absolute inset-x-[-10%] top-[18%] h-24 rotate-[-4deg] bg-[linear-gradient(90deg,transparent,rgba(192,132,252,0.18),transparent)] blur-2xl" />
      <div className="absolute inset-x-[-8%] bottom-[18%] h-20 rotate-[3deg] bg-[linear-gradient(90deg,transparent,rgba(123,44,255,0.2),transparent)] blur-2xl" />

      <svg
        className="absolute inset-x-[-8%] top-[17%] h-[24rem] w-[116%] text-onda-purple/36 dark:text-onda-lavender/32"
        viewBox="0 0 1440 360"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {[0, 1, 2].map((line) => (
          <motion.path
            key={line}
            d={`M0 ${116 + line * 58} C 120 ${42 + line * 20}, 250 ${235 - line * 22}, 380 ${
              144 + line * 34
            } S 650 ${86 + line * 48}, 780 ${154 + line * 20} S 1060 ${252 - line * 35}, 1200 ${
              136 + line * 32
            } S 1360 ${82 + line * 44}, 1440 ${150 + line * 26}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={line === 1 ? 2.4 : 1.4}
            strokeLinecap="round"
            strokeDasharray="12 26"
            initial={{ strokeDashoffset: 0, opacity: 0.16 + line * 0.12 }}
            animate={{ strokeDashoffset: [-30, 90], opacity: [0.16 + line * 0.12, 0.34, 0.16 + line * 0.12] }}
            transition={{ duration: 8 + line, repeat: Infinity, ease: 'linear' }}
          />
        ))}
      </svg>

      <div className="absolute left-1/2 top-[48%] hidden -translate-x-1/2 items-center gap-2 opacity-45 md:flex">
        {waveBars.map((height, index) => (
          <motion.span
            key={`${height}-${index}`}
            className="w-1 rounded-full bg-onda-lavender/55 shadow-[0_0_18px_rgba(168,85,247,0.38)]"
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
  const { t } = useI18n()
  const robot = useRobotAsset()
  const logo = useBrandLogoAsset()

  return (
    <section className="relative h-full min-h-full overflow-hidden px-4 sm:px-6 lg:px-8">
      <HeroAtmosphere />
      <div className="onda-container relative z-10 flex h-full min-h-full items-center justify-center py-10 sm:py-12">
        <motion.div
          className="relative isolate flex w-full max-w-6xl flex-col items-center justify-center text-center"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: 'easeOut' }}
        >
          <div className="pointer-events-none absolute inset-x-[6%] top-[38%] h-20 -translate-y-1/2 bg-[linear-gradient(90deg,transparent,rgba(192,132,252,0.24),transparent)] blur-2xl" />

          {!robot.isMissing ? (
            <motion.img
              src={robot.src}
              alt="Robot ONDA Multimedia"
              className="pointer-events-none relative z-20 order-2 mt-2 h-24 w-24 object-contain drop-shadow-[0_22px_52px_rgba(123,44,255,0.32)] sm:absolute sm:bottom-4 sm:left-8 sm:mt-0 sm:h-44 sm:w-44 md:h-52 md:w-52 lg:bottom-0 lg:left-10 lg:h-64 lg:w-64 xl:h-72 xl:w-72"
              onError={robot.onError}
              initial={{ opacity: 0, x: -34, rotate: -4 }}
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
            className="relative z-10 mx-auto w-full max-w-[21rem] sm:max-w-[40rem] md:max-w-[46rem] lg:max-w-[48rem]"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          >
            <div className="pointer-events-none absolute inset-x-[-4%] top-[-8%] h-[82%] rounded-full bg-white/70 blur-3xl dark:hidden" />
            {!logo.isMissing ? (
              <img
                src={logo.src}
                alt="ONDA MULTIMEDIA"
                className="relative mx-auto w-full object-contain drop-shadow-[0_0_24px_rgba(123,44,255,0.42)] sm:drop-shadow-[0_0_42px_rgba(168,85,247,0.36)]"
                onError={logo.onError}
              />
            ) : (
              <h1 className="font-display text-5xl font-black uppercase leading-none text-white drop-shadow-[0_0_34px_rgba(168,85,247,0.45)] sm:text-7xl">
                ONDA MULTIMEDIA
              </h1>
            )}
          </motion.div>

          <motion.div
            className="relative z-20 mt-7 flex w-full flex-col items-center justify-center gap-3 sm:mt-8 sm:flex-row"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.28 }}
          >
            <HeroGlassButton className="brand-hero-button" to="/servicios" icon={<ArrowRight className="h-4 w-4" />} variant="primary">
              {t('nav.services')}
            </HeroGlassButton>
            <HeroGlassButton className="brand-hero-button" to="/eventos" icon={<Calendar className="h-4 w-4" />}>
              {t('nav.events')}
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
  const isVektorben = slide.name.toLowerCase() === 'vektorben'
  const fallbackBackground =
    slide.accent ??
    'radial-gradient(circle at 20% 25%, rgba(168,85,247,0.32), transparent 24%), radial-gradient(circle at 80% 70%, rgba(123,44,255,0.28), transparent 24%), linear-gradient(135deg, #050505 0%, #121018 55%, #050505 100%)'

  return (
    <section className="relative h-full min-h-full overflow-hidden px-4 text-white sm:px-6 lg:px-8">
      {hasImage ? (
        <img
          src={slide.backgroundImage}
          alt=""
          aria-hidden="true"
          className={cn(
            'absolute inset-0 h-full min-h-full w-full scale-[1.01] object-cover',
            isVektorben && 'vektorben-hero-image',
          )}
          style={isVektorben ? undefined : { objectPosition: slide.backgroundPosition ?? 'center center' }}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: fallbackBackground }} />
      )}
      <div
        className={cn(
          'absolute inset-0',
          isVektorben
            ? 'bg-[linear-gradient(90deg,rgba(5,5,5,0.58)_0%,rgba(5,5,5,0.28)_38%,rgba(5,5,5,0.1)_68%,rgba(5,5,5,0.34)_100%)]'
            : 'bg-[linear-gradient(90deg,rgba(5,5,5,0.82)_0%,rgba(5,5,5,0.42)_42%,rgba(5,5,5,0.68)_100%)]',
        )}
      />
      <div
        className={cn(
          'absolute inset-0',
          isVektorben
            ? 'bg-[linear-gradient(180deg,rgba(5,5,5,0.04)_0%,rgba(123,44,255,0.08)_52%,rgba(5,5,5,0.2)_100%)]'
            : 'bg-[radial-gradient(circle_at_48%_50%,rgba(168,85,247,0.18),transparent_34%),linear-gradient(180deg,rgba(5,5,5,0.16)_0%,rgba(5,5,5,0.66)_100%)]',
        )}
      />
      {!isVektorben ? <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/45 to-transparent" /> : null}

      <div
        className={cn(
          isVektorben
            ? 'absolute bottom-[clamp(4.75rem,10vh,8rem)] left-[clamp(1rem,5vw,6rem)] z-10 w-[calc(100%_-_2rem)] sm:w-auto'
            : 'onda-container relative z-10 flex h-full min-h-full items-end py-16 sm:items-center',
        )}
      >
        <motion.div
          className={cn(
            'rounded-lg border border-white/18 bg-black/28 shadow-[0_26px_100px_rgba(123,44,255,0.22)] backdrop-blur-2xl',
            isVektorben
              ? 'w-full max-w-[24rem] bg-black/24 p-4 shadow-[0_18px_70px_rgba(123,44,255,0.18)] sm:max-w-[26rem] sm:p-5'
              : 'max-w-xl p-5 sm:p-6',
          )}
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.72, ease: 'easeOut' }}
        >
          <h2
            className={cn(
              'font-display font-black uppercase leading-none text-white drop-shadow-[0_0_28px_rgba(168,85,247,0.35)]',
              isVektorben ? 'text-3xl sm:text-4xl lg:text-5xl' : 'text-4xl sm:text-5xl lg:text-6xl',
            )}
          >
            {slide.name}
          </h2>
          {!isVektorben && slide.tagline ? (
            <p className="mt-3 max-w-md text-sm font-medium text-white/78 sm:text-base">{slide.tagline}</p>
          ) : null}

          {isVektorben ? (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <a
                href="#"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/18 bg-white/10 px-4 font-display text-[0.62rem] font-bold uppercase tracking-[0.14em] text-white shadow-[0_0_22px_rgba(123,44,255,0.18)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-onda-lavender/70 hover:bg-onda-purple/22 hover:shadow-[0_0_32px_rgba(168,85,247,0.38)]"
              >
                <User className="h-3.5 w-3.5" aria-hidden="true" />
                Ver artista
              </a>
              <VektorbenSocialLink href={vektorbenSpotifyUrl} label="Abrir Spotify de Vektorben">
                <SpotifyIcon />
              </VektorbenSocialLink>
              <VektorbenSocialLink href={vektorbenInstagramUrl} label="Abrir Instagram de Vektorben">
                <InstagramIcon />
              </VektorbenSocialLink>
            </div>
          ) : (
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
          )}
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
