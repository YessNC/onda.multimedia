import { Camera, ExternalLink, Film, Image as ImageIcon, Link as LinkIcon, PlayCircle, Sparkles, Video } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { EffectCoverflow } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/effect-coverflow'
import {
  getDirectVideoMime,
  getEventGalleryContent,
  getInstagramEmbedUrl,
  getYouTubeEmbedUrl,
  hasEventGalleryContent,
  isDirectVideoUrl,
  type EventGalleryMedia,
} from '../../lib/eventGallery'
import type { EventRecord } from '../../lib/events'

type EventGallerySectionProps = {
  event: EventRecord
}

type LazyFrameProps = {
  className?: string
  icon: ReactNode
  src: string
  title: string
}

const futureContentItems = [
  { icon: Camera, label: 'Fotos' },
  { icon: Video, label: 'Videos' },
  { icon: Film, label: 'Reels' },
  { icon: Sparkles, label: 'Video Oficial' },
  { icon: ExternalLink, label: 'Links externos' },
]

function useInViewport<T extends HTMLElement>(rootMargin = '240px') {
  const ref = useRef<T | null>(null)
  const [isVisible, setIsVisible] = useState(
    () => typeof window !== 'undefined' && !('IntersectionObserver' in window),
  )

  useEffect(() => {
    if (isVisible) return undefined

    const element = ref.current

    if (!element) return undefined

    if (!('IntersectionObserver' in window)) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return

        setIsVisible(true)
        observer.disconnect()
      },
      { rootMargin },
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [isVisible, rootMargin])

  return [ref, isVisible] as const
}

function MediaPlaceholder({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="tech-grid flex h-full min-h-56 w-full items-center justify-center bg-onda-night px-4 text-center text-onda-soft">
      <div className="grid justify-items-center gap-3">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-md border border-onda-lavender/30 bg-white/10 text-onda-lavender shadow-[0_0_28px_rgba(168,85,247,0.24)]">
          {icon}
        </span>
        <span className="font-display text-xs font-bold uppercase tracking-[0.16em] text-onda-soft">{title}</span>
      </div>
    </div>
  )
}

function LazyFrame({ className = '', icon, src, title }: LazyFrameProps) {
  const [frameRef, isVisible] = useInViewport<HTMLDivElement>()

  return (
    <div
      ref={frameRef}
      className={`relative isolate aspect-video min-h-56 overflow-hidden rounded-lg border border-onda-purple/22 bg-onda-black shadow-[0_0_34px_rgba(123,44,255,0.14)] dark:border-onda-lavender/24 ${className}`}
    >
      {isVisible ? (
        <iframe
          src={src}
          title={title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <MediaPlaceholder icon={icon} title={title} />
      )}
    </div>
  )
}

function LazyDirectVideo({ video }: { video: EventGalleryMedia }) {
  const [videoRef, isVisible] = useInViewport<HTMLDivElement>()

  return (
    <div
      ref={videoRef}
      className="relative isolate aspect-video min-h-56 overflow-hidden rounded-lg border border-onda-purple/22 bg-onda-black shadow-[0_0_34px_rgba(123,44,255,0.14)] dark:border-onda-lavender/24"
    >
      {isVisible ? (
        <video controls preload="metadata" className="absolute inset-0 h-full w-full bg-black object-cover">
          <source src={video.url} type={getDirectVideoMime(video.url)} />
        </video>
      ) : (
        <MediaPlaceholder icon={<PlayCircle className="h-5 w-5" aria-hidden="true" />} title={video.title} />
      )}
    </div>
  )
}

function GalleryBlock({ children, icon, title }: { children: ReactNode; icon: ReactNode; title: string }) {
  return (
    <div className="grid gap-4">
      <h3 className="inline-flex min-w-0 items-center gap-2 font-display text-sm font-bold uppercase tracking-[0.16em] text-onda-purple dark:text-onda-lavender">
        {icon}
        <span className="min-w-0 break-words">{title}</span>
      </h3>
      {children}
    </div>
  )
}

function Aftermovie({ video }: { video: EventGalleryMedia }) {
  const youtubeEmbedUrl = getYouTubeEmbedUrl(video.url)

  if (youtubeEmbedUrl) {
    return (
      <LazyFrame
        src={youtubeEmbedUrl}
        title={video.title}
        icon={<PlayCircle className="h-5 w-5" aria-hidden="true" />}
        className="lg:min-h-[28rem]"
      />
    )
  }

  if (isDirectVideoUrl(video.url)) {
    return <LazyDirectVideo video={video} />
  }

  return (
    <a
      href={video.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-12 w-fit items-center justify-center gap-2 rounded-md bg-onda-purple px-4 py-3 font-display text-xs font-bold uppercase tracking-[0.14em] text-white shadow-[0_0_24px_rgba(123,44,255,0.3)] transition hover:bg-onda-electric"
    >
      <ExternalLink className="h-4 w-4" aria-hidden="true" />
      {video.title}
    </a>
  )
}

function EmptyGallery() {
  return (
    <div className="tech-grid overflow-hidden rounded-lg border border-dashed border-onda-purple/40 bg-white/60 p-6 shadow-[0_0_44px_rgba(123,44,255,0.14)] dark:border-onda-lavender/40 dark:bg-onda-black/55 sm:p-8">
      <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-md border border-onda-purple/25 bg-white/70 text-onda-purple shadow-[0_0_28px_rgba(123,44,255,0.16)] dark:bg-onda-black/70 dark:text-onda-lavender">
          <Camera className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-onda-purple dark:text-onda-lavender">
            Contenido en preparacion
          </p>
          <h3 className="mt-2 font-display text-xl font-extrabold uppercase tracking-[0.08em] text-zinc-950 dark:text-white">
            Galeria proximamente
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600 dark:text-onda-muted">
            Cuando el evento finalice, aqui compartiremos registros oficiales, fotografias y momentos destacados.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {futureContentItems.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex min-h-9 items-center gap-2 rounded-full border border-onda-purple/20 bg-white/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-onda-purple dark:bg-white/5 dark:text-onda-lavender"
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EventGallerySection({ event }: EventGallerySectionProps) {
  const [activeTab, setActiveTab] = useState<'official' | 'photos' | 'videos' | 'reels' | 'links'>('official')
  const gallery = getEventGalleryContent(event)
  const youtubeEmbeds = gallery.youtubeVideos
    .map((video) => ({ ...video, embedUrl: getYouTubeEmbedUrl(video.url) }))
    .filter((video) => video.embedUrl)
  const instagramEmbeds = gallery.instagramReels
    .map((reel) => ({ ...reel, embedUrl: getInstagramEmbedUrl(reel.url) }))
    .filter((reel) => reel.embedUrl)
  const hasContent =
    hasEventGalleryContent(gallery) &&
    Boolean(
      gallery.aftermovie ||
        gallery.photos.length > 0 ||
        youtubeEmbeds.length > 0 ||
        instagramEmbeds.length > 0 ||
        gallery.externalLinks.length > 0,
    )

  const tabs = [
    { id: 'official' as const, label: 'Video Oficial', icon: Sparkles, hasContent: !!gallery.aftermovie },
    { id: 'photos' as const, label: 'Fotos', icon: ImageIcon, hasContent: gallery.photos.length > 0 },
    { id: 'videos' as const, label: 'Videos', icon: Video, hasContent: youtubeEmbeds.length > 0 },
    { id: 'reels' as const, label: 'Reels', icon: Film, hasContent: instagramEmbeds.length > 0 },
    { id: 'links' as const, label: 'Links', icon: LinkIcon, hasContent: gallery.externalLinks.length > 0 },
  ].filter((tab) => tab.hasContent)

  return (
    <section className="py-16 sm:py-20">
      <div className="onda-container">
        <div className="mb-8">
          <p className="mb-3 inline-flex items-center gap-2 font-display text-xs font-bold uppercase tracking-[0.3em] text-onda-purple dark:text-onda-lavender">
            <span className="h-px w-8 bg-onda-purple opacity-70" />
            Registro oficial
          </p>
          <h2 className="font-display text-3xl font-extrabold uppercase tracking-[0.1em] text-zinc-950 dark:text-white">
            Galeria del evento
          </h2>
        </div>

        {hasContent ? (
          <div className="grid gap-8">
            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2 border-b border-onda-purple/20 dark:border-onda-lavender/20 pb-4">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-display text-xs font-bold uppercase tracking-[0.12em] transition ${
                      activeTab === tab.id
                        ? 'bg-onda-purple text-white shadow-[0_0_24px_rgba(123,44,255,0.3)] dark:bg-onda-lavender dark:text-onda-black'
                        : 'border border-onda-purple/30 text-onda-purple hover:border-onda-purple/60 dark:border-onda-lavender/30 dark:text-onda-lavender dark:hover:border-onda-lavender/60'
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {/* Tab Content */}
            {activeTab === 'official' && gallery.aftermovie ? (
              <GalleryBlock icon={<Sparkles className="h-4 w-4" aria-hidden="true" />} title="Video Oficial">
                <Aftermovie video={gallery.aftermovie} />
              </GalleryBlock>
            ) : null}

            {activeTab === 'photos' && gallery.photos.length > 0 ? (
              <GalleryBlock icon={<ImageIcon className="h-4 w-4" aria-hidden="true" />} title="Fotos">
                <Swiper
                  effect="coverflow"
                  grabCursor={true}
                  centeredSlides={true}
                  slidesPerView="auto"
                  coverflowEffect={{
                    rotate: 50,
                    stretch: 0,
                    depth: 100,
                    modifier: 1,
                    slideShadows: true,
                  }}
                  modules={[EffectCoverflow]}
                  className="w-full"
                >
                  {gallery.photos.map((photo) => (
                    <SwiperSlide key={photo.src} className="w-80 h-auto">
                      <figure className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-onda-purple/18 bg-white/60 shadow-[0_0_28px_rgba(123,44,255,0.12)] dark:bg-onda-black/55 h-full">
                        <img
                          src={photo.src}
                          srcSet={photo.srcSet}
                          sizes={photo.sizes}
                          width={photo.width}
                          height={photo.height}
                          alt={photo.alt}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
                        />
                      </figure>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </GalleryBlock>
            ) : null}

            {activeTab === 'videos' && youtubeEmbeds.length > 0 ? (
              <GalleryBlock icon={<Video className="h-4 w-4" aria-hidden="true" />} title="Videos">
                <Swiper
                  grabCursor={true}
                  spaceBetween={16}
                  breakpoints={{
                    320: {
                      slidesPerView: 1,
                    },
                    1024: {
                      slidesPerView: 2,
                    },
                  }}
                  className="w-full"
                >
                  {youtubeEmbeds.map((video) => (
                    <SwiperSlide key={video.url}>
                      <LazyFrame
                        src={video.embedUrl}
                        title={video.title}
                        icon={<PlayCircle className="h-5 w-5" aria-hidden="true" />}
                      />
                    </SwiperSlide>
                  ))}
                </Swiper>
              </GalleryBlock>
            ) : null}

            {activeTab === 'reels' && instagramEmbeds.length > 0 ? (
              <GalleryBlock icon={<Film className="h-4 w-4" aria-hidden="true" />} title="Reels">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {instagramEmbeds.map((reel) => (
                    <LazyFrame
                      key={reel.url}
                      src={reel.embedUrl}
                      title={reel.title}
                      icon={<Film className="h-5 w-5" aria-hidden="true" />}
                      className="aspect-[9/14] min-h-[34rem]"
                    />
                  ))}
                </div>
              </GalleryBlock>
            ) : null}

            {activeTab === 'links' && gallery.externalLinks.length > 0 ? (
              <GalleryBlock icon={<LinkIcon className="h-4 w-4" aria-hidden="true" />} title="Links externos">
                <div className="flex flex-wrap gap-3">
                  {gallery.externalLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center gap-2 rounded-md border border-onda-purple/30 bg-white/70 px-4 py-3 font-display text-xs font-bold uppercase tracking-[0.14em] text-onda-purple transition hover:border-onda-purple hover:bg-onda-purple/10 dark:bg-white/5 dark:text-onda-soft"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      {link.label}
                    </a>
                  ))}
                </div>
              </GalleryBlock>
            ) : null}
          </div>
        ) : (
          <EmptyGallery />
        )}
      </div>
    </section>
  )
}
