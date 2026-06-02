import { motion } from 'framer-motion'
import { ArrowDown, ArrowRight, Calendar, Music, Play, User } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { getArtistHeroOpenLabelKey, getArtistPlatformLinks, getArtistSocialLinks } from '../../data/artistPlatforms'
import { useBrandLogoAsset } from '../../lib/brandAssets'
import { useTheme } from '../../lib/theme'
import { cn } from '../../lib/utils'
import { useI18n } from '../../hooks/useI18n'
import ArtistPlatformIcon, { SpotifyIcon } from '../shared/ArtistPlatformIcon'

const robotDaySrc = '/assets/brand/robot-day.png'
const robotNightSrc = '/assets/brand/robot-night.png'

type BrandHeroSlide = {
  kind: 'brand'
}

type ArtistHeroSlide = {
  accent?: string
  backgroundImage?: string
  backgroundImageMobile?: string
  backgroundImageTablet?: string
  backgroundPosition?: string
  kind: 'artist'
  name?: string
  nameKey?: string
  tagline?: string
  taglineKey?: string
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

function VektorbenSocialLink({ children, href, label }: { children: ReactNode; href: string; label: string }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'vektorben-social-link inline-flex h-[2.15rem] w-[2.15rem] shrink-0 items-center justify-center rounded-md border p-[0.48rem] transition duration-300 backdrop-blur-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-onda-lavender sm:h-9 sm:w-9 sm:p-2 lg:h-[2.35rem] lg:w-[2.35rem] lg:p-[0.55rem]',
        isDark
          ? 'border-white/18 bg-white/10 text-white shadow-[0_0_22px_rgba(123,44,255,0.18)] hover:-translate-y-0.5 hover:border-onda-lavender/70 hover:bg-onda-purple/22 hover:shadow-[0_0_32px_rgba(168,85,247,0.38)]'
          : 'border-zinc-800/60 bg-zinc-900/15 text-zinc-800 shadow-[0_0_12px_rgba(24,24,27,0.08)] hover:-translate-y-0.5 hover:border-zinc-700 hover:bg-zinc-900/25 hover:shadow-[0_0_16px_rgba(24,24,27,0.16)]',
      )}
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
      className="mt-8 flex flex-col items-center gap-2 text-onda-purple dark:text-onda-lavender md:mt-4 md:-translate-y-4 pointer-events-none"
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
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 767px)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(max-width: 767px)')
    const updateIsMobile = (event: MediaQueryListEvent) => setIsMobile(event.matches)

    mediaQuery.addEventListener('change', updateIsMobile)

    return () => mediaQuery.removeEventListener('change', updateIsMobile)
  }, [])

  return (
    <section className="relative h-full min-h-full overflow-hidden px-4 sm:px-6 lg:px-8 pt-20 md:pt-0">
      <HeroAtmosphere />
      <div className="onda-container relative z-10 flex h-full min-h-full items-center justify-center py-10 sm:py-12">
        <motion.div
          className="relative isolate flex w-full max-w-6xl flex-col items-center justify-center text-center"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: 'easeOut' }}
        >
          <div className="pointer-events-none absolute inset-x-[6%] top-[38%] h-20 -translate-y-1/2 bg-[linear-gradient(90deg,transparent,rgba(192,132,252,0.24),transparent)] blur-2xl" />

          {!robot.isMissing && !isMobile ? (
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
  const hasResponsiveImage = Boolean(slide.backgroundImageMobile || slide.backgroundImageTablet)
  const { t } = useI18n()
  const { theme } = useTheme()
  const displayName = slide.nameKey ? t(slide.nameKey) : slide.name ?? ''
  const displayTagline = slide.taglineKey ? t(slide.taglineKey) : slide.tagline
  const featuredArtistKey = displayName.toLowerCase()
  const featuredArtistLinks = getArtistPlatformLinks(featuredArtistKey)
  const featuredArtistSpotifyLink = featuredArtistLinks.find((link) => link.platform === 'spotify')
  const featuredArtistSocials = getArtistSocialLinks(featuredArtistKey)
  const hasFeaturedArtistCard = Boolean(featuredArtistSpotifyLink)
  const isVektorbenSlide = featuredArtistKey === 'vektorben'
  const isDark = theme === 'dark'
  const fallbackBackground =
    slide.accent ??
    'radial-gradient(circle at 20% 25%, rgba(168,85,247,0.32), transparent 24%), radial-gradient(circle at 80% 70%, rgba(123,44,255,0.28), transparent 24%), linear-gradient(135deg, #050505 0%, #121018 55%, #050505 100%)'

  return (
    <section className="relative h-full min-h-full overflow-hidden px-4 text-white sm:px-6 lg:px-8">
      {hasImage && hasResponsiveImage ? (
        <picture className="absolute inset-0 block h-full min-h-full w-full">
          {slide.backgroundImageMobile ? <source media="(max-width: 640px)" srcSet={slide.backgroundImageMobile} /> : null}
          {slide.backgroundImageTablet ? (
            <source media="(min-width: 641px) and (max-width: 1024px)" srcSet={slide.backgroundImageTablet} />
          ) : null}
          <source media="(min-width: 1025px)" srcSet={slide.backgroundImage} />
          <img
            src={slide.backgroundImage}
            alt=""
            aria-hidden="true"
            className={cn(
              'h-full min-h-full w-full scale-[1.01] object-cover',
              hasFeaturedArtistCard && 'vektorben-hero-image',
              isVektorbenSlide && 'vektorben-hero-image--mobile-balanced',
            )}
            style={hasFeaturedArtistCard ? undefined : { objectPosition: slide.backgroundPosition ?? 'center center' }}
          />
        </picture>
      ) : hasImage ? (
        <img
          src={slide.backgroundImage}
          alt=""
          aria-hidden="true"
          className={cn(
            'absolute inset-0 h-full min-h-full w-full scale-[1.01] object-cover',
            hasFeaturedArtistCard && 'vektorben-hero-image',
            isVektorbenSlide && 'vektorben-hero-image--mobile-balanced',
          )}
          style={hasFeaturedArtistCard ? undefined : { objectPosition: slide.backgroundPosition ?? 'center center' }}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: fallbackBackground }} />
      )}
      <div
        className={cn(
          'absolute inset-0',
          hasFeaturedArtistCard
            ? 'bg-[linear-gradient(90deg,rgba(5,5,5,0.58)_0%,rgba(5,5,5,0.28)_38%,rgba(5,5,5,0.1)_68%,rgba(5,5,5,0.34)_100%)]'
            : 'bg-[linear-gradient(90deg,rgba(5,5,5,0.82)_0%,rgba(5,5,5,0.42)_42%,rgba(5,5,5,0.68)_100%)]',
        )}
      />
      <div
        className={cn(
          'absolute inset-0',
          hasFeaturedArtistCard
            ? 'bg-[linear-gradient(180deg,rgba(5,5,5,0.04)_0%,rgba(123,44,255,0.08)_52%,rgba(5,5,5,0.2)_100%)]'
            : 'bg-[radial-gradient(circle_at_48%_50%,rgba(168,85,247,0.18),transparent_34%),linear-gradient(180deg,rgba(5,5,5,0.16)_0%,rgba(5,5,5,0.66)_100%)]',
        )}
      />
      {!hasFeaturedArtistCard ? <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/45 to-transparent" /> : null}

      <div
        className={cn(
          hasFeaturedArtistCard
            ? 'vektorben-hero-content absolute bottom-[clamp(2.5rem,4.8svh,3.25rem)] left-[clamp(1rem,5vw,6rem)] z-10 w-[calc(100%_-_2rem)] sm:bottom-[clamp(3rem,5.2vh,4.25rem)] sm:w-auto lg:bottom-[clamp(2.8rem,5.5vh,4.6rem)]'
            : 'onda-container relative z-10 flex h-full min-h-full items-end py-16 sm:items-center',
          isVektorbenSlide && 'vektorben-hero-content--mobile-balanced',
        )}
      >
        <motion.div
          className={cn(
            'rounded-lg border backdrop-blur-2xl',
            hasFeaturedArtistCard
              ? isDark
                ? 'vektorben-hero-card w-full max-w-full border-white/18 bg-black/24 p-3 shadow-[0_18px_70px_rgba(123,44,255,0.18)] sm:max-w-[30rem] sm:p-5 lg:max-w-[32rem]'
                : 'vektorben-hero-card w-full max-w-full border-onda-purple/35 bg-white/95 p-3 shadow-[0_18px_70px_rgba(123,44,255,0.16)] sm:max-w-[30rem] sm:p-5 lg:max-w-[32rem]'
              : 'max-w-xl border-white/18 bg-black/28 p-5 shadow-[0_26px_100px_rgba(123,44,255,0.22)] sm:p-6',
          )}
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.72, ease: 'easeOut' }}
        >
          <h2
            className={cn(
              'font-display font-black uppercase leading-none',
              hasFeaturedArtistCard
                ? isDark
                  ? 'vektorben-hero-title text-3xl text-white drop-shadow-[0_0_28px_rgba(168,85,247,0.35)] sm:text-4xl lg:text-5xl'
                  : 'vektorben-hero-title text-3xl text-zinc-900 sm:text-4xl lg:text-5xl'
                : 'text-4xl text-white drop-shadow-[0_0_28px_rgba(168,85,247,0.35)] sm:text-5xl lg:text-6xl',
            )}
          >
            {displayName}
          </h2>
          {!hasFeaturedArtistCard && displayTagline ? (
            <p className="mt-3 max-w-md text-sm font-medium text-white/78 sm:text-base">{displayTagline}</p>
          ) : null}

          {featuredArtistSpotifyLink ? (
            <div className="vektorben-hero-actions mt-3 flex flex-nowrap items-center gap-[0.35rem] overflow-x-auto pb-0.5 sm:mt-5 sm:gap-2 sm:overflow-visible sm:pb-0">
              <a
                href={featuredArtistSpotifyLink.href}
                aria-label={`${t('hero.open-spotify')} ${displayName}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'vektorben-hero-primary inline-flex h-[2.15rem] min-w-[7.85rem] shrink-0 items-center justify-center gap-1.5 rounded-md border px-2 font-display text-[0.5rem] font-bold uppercase tracking-[0.1em] transition duration-300 backdrop-blur-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-onda-lavender sm:h-9 sm:min-w-[8.9rem] sm:gap-2 sm:px-3 sm:text-[0.56rem] sm:tracking-[0.12em] lg:h-[2.35rem] lg:min-w-[9.35rem] lg:px-[0.9rem] lg:text-[0.6rem] lg:tracking-[0.14em]',
                  isDark
                    ? 'border-white/18 bg-white/10 text-white shadow-[0_0_22px_rgba(123,44,255,0.18)] hover:-translate-y-0.5 hover:border-onda-lavender/70 hover:bg-onda-purple/22 hover:shadow-[0_0_32px_rgba(168,85,247,0.38)]'
                    : 'border-zinc-800/60 bg-zinc-900/15 text-zinc-800 shadow-[0_0_12px_rgba(24,24,27,0.08)] hover:-translate-y-0.5 hover:border-zinc-700 hover:bg-zinc-900/25 hover:shadow-[0_0_16px_rgba(24,24,27,0.16)]',
                )}
              >
                <SpotifyIcon className="h-3.5 w-3.5" />
                {t('hero.view-artist')}
              </a>
              {featuredArtistSocials.map((social) => (
                <VektorbenSocialLink
                  key={social.platform}
                  href={social.href}
                  label={`${t(getArtistHeroOpenLabelKey(social.platform))} ${displayName}`}
                >
                  <ArtistPlatformIcon platform={social.platform} />
                </VektorbenSocialLink>
              ))}
            </div>
          ) : (
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <HeroGlassButton href="#" icon={<User className="h-4 w-4" />} className="w-full">
                {t('hero.view-artist')}
              </HeroGlassButton>
              <HeroGlassButton href="#" icon={<Play className="h-4 w-4" />} className="w-full">
                {t('hero.listen-youtube')}
              </HeroGlassButton>
              <HeroGlassButton href="#" icon={<Music className="h-4 w-4" />} className="w-full">
                {t('hero.listen-spotify')}
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
