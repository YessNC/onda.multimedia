import { getEventCoverImageUrl, isValidHttpUrl, readString } from './events'

export type EventGalleryPhoto = {
  alt: string
  height?: number
  sizes?: string
  src: string
  srcSet?: string
  width?: number
}

export type EventGalleryMedia = {
  title: string
  url: string
}

export type EventGalleryLink = {
  href: string
  label: string
}

export type EventGalleryContent = {
  aftermovie: EventGalleryMedia | null
  externalLinks: EventGalleryLink[]
  instagramReels: EventGalleryMedia[]
  photos: EventGalleryPhoto[]
  youtubeVideos: EventGalleryMedia[]
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function isPresent<T>(value: T | null | undefined): value is T {
  return Boolean(value)
}

function readArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value

  const text = readString(value)

  if (!text) return []

  try {
    const parsed = JSON.parse(text) as unknown
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  }
}

function readPositiveNumber(value: unknown) {
  const numberValue = typeof value === 'number' ? value : Number(readString(value))
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : undefined
}

function readFirstValue(record: Record<string, unknown> | null, keys: string[]) {
  if (!record) return ''

  for (const key of keys) {
    const value = readString(record[key])

    if (value) return value
  }

  return ''
}

function readEventGalleryRecord(event: Record<string, unknown> | null | undefined) {
  return asRecord(event?.event_gallery)
}

function readGalleryValues(event: Record<string, unknown> | null | undefined, keys: string[]) {
  const galleryRecord = readEventGalleryRecord(event)

  for (const key of keys) {
    const value = event?.[key] ?? galleryRecord?.[key]
    const values = readArray(value)

    if (values.length > 0) return values
  }

  return []
}

function readGallerySingleValue(event: Record<string, unknown> | null | undefined, keys: string[]) {
  const galleryRecord = readEventGalleryRecord(event)

  for (const key of keys) {
    const value = event?.[key] ?? galleryRecord?.[key]
    const textValue = readString(value)

    if (textValue) return textValue

    const recordValue = asRecord(value)

    if (recordValue) return recordValue
  }

  return null
}

function getUrlLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '') || 'Link externo'
  } catch {
    return 'Link externo'
  }
}

function normalizePhoto(item: unknown, index: number): EventGalleryPhoto | null {
  const itemRecord = asRecord(item)
  const source = itemRecord
    ? readFirstValue(itemRecord, ['src', 'url', 'path', 'image', 'image_url'])
    : readString(item)
  const src = getEventCoverImageUrl(source)

  if (!src) return null

  return {
    alt: itemRecord ? readFirstValue(itemRecord, ['alt', 'title', 'caption']) || `Foto ${index + 1}` : `Foto ${index + 1}`,
    height: readPositiveNumber(itemRecord?.height),
    sizes: readString(itemRecord?.sizes) || '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
    src,
    srcSet: readString(itemRecord?.srcSet) || readString(itemRecord?.srcset) || undefined,
    width: readPositiveNumber(itemRecord?.width),
  }
}

function normalizeMedia(item: unknown, fallbackTitle: string, index: number): EventGalleryMedia | null {
  const itemRecord = asRecord(item)
  const url = itemRecord ? readFirstValue(itemRecord, ['url', 'href', 'src']) : readString(item)

  if (!isValidHttpUrl(url)) return null

  return {
    title: itemRecord ? readFirstValue(itemRecord, ['title', 'label', 'caption']) || `${fallbackTitle} ${index + 1}` : `${fallbackTitle} ${index + 1}`,
    url,
  }
}

function normalizeLink(item: unknown): EventGalleryLink | null {
  const itemRecord = asRecord(item)
  const href = itemRecord ? readFirstValue(itemRecord, ['href', 'url']) : readString(item)

  if (!isValidHttpUrl(href)) return null

  return {
    href,
    label: itemRecord ? readFirstValue(itemRecord, ['label', 'title', 'text']) || getUrlLabel(href) : getUrlLabel(href),
  }
}

function normalizeAftermovie(item: unknown): EventGalleryMedia | null {
  const itemRecord = asRecord(item)
  const url = itemRecord ? readFirstValue(itemRecord, ['url', 'href', 'src']) : readString(item)

  if (!isValidHttpUrl(url)) return null

  return {
    title: itemRecord ? readFirstValue(itemRecord, ['title', 'label', 'caption']) || 'Aftermovie' : 'Aftermovie',
    url,
  }
}

export function getYouTubeEmbedUrl(url: string) {
  if (!isValidHttpUrl(url)) return ''

  const parsedUrl = new URL(url)
  const hostname = parsedUrl.hostname.replace(/^www\./, '').toLowerCase()
  const segments = parsedUrl.pathname.split('/').filter(Boolean)
  let videoId = ''

  if (hostname === 'youtu.be') {
    videoId = segments[0] ?? ''
  }

  if (hostname.endsWith('youtube.com') || hostname === 'youtube-nocookie.com') {
    if (segments[0] === 'watch') {
      videoId = parsedUrl.searchParams.get('v') ?? ''
    } else if (segments[0] === 'embed' || segments[0] === 'shorts' || segments[0] === 'live') {
      videoId = segments[1] ?? ''
    }
  }

  return videoId ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}` : ''
}

export function getInstagramEmbedUrl(url: string) {
  if (!isValidHttpUrl(url)) return ''

  const parsedUrl = new URL(url)
  const hostname = parsedUrl.hostname.replace(/^www\./, '').toLowerCase()

  if (hostname !== 'instagram.com') return ''

  const [contentType, shortcode] = parsedUrl.pathname.split('/').filter(Boolean)

  if (!shortcode || (contentType !== 'reel' && contentType !== 'p' && contentType !== 'tv')) return ''

  return `https://www.instagram.com/${contentType}/${encodeURIComponent(shortcode)}/embed`
}

export function isDirectVideoUrl(url: string) {
  if (!isValidHttpUrl(url)) return false

  return /\.(mp4|webm|ogg)(?:$|[?#])/i.test(new URL(url).pathname)
}

export function getDirectVideoMime(url: string) {
  const pathname = isValidHttpUrl(url) ? new URL(url).pathname.toLowerCase() : ''

  if (pathname.endsWith('.webm')) return 'video/webm'
  if (pathname.endsWith('.ogg')) return 'video/ogg'

  return 'video/mp4'
}

export function getEventGalleryContent(event: Record<string, unknown> | null | undefined): EventGalleryContent {
  const aftermovie = readGallerySingleValue(event, ['aftermovie', 'aftermovie_url', 'featured_video', 'featured_video_url'])

  return {
    aftermovie: normalizeAftermovie(aftermovie),
    externalLinks: readGalleryValues(event, ['external_links', 'links']).map(normalizeLink).filter(isPresent),
    instagramReels: readGalleryValues(event, ['instagram_reel_urls', 'instagram_reels', 'reels'])
      .map((item, index) => normalizeMedia(item, 'Reel', index))
      .filter(isPresent),
    photos: readGalleryValues(event, ['gallery_photos', 'photos', 'images'])
      .map(normalizePhoto)
      .filter(isPresent),
    youtubeVideos: readGalleryValues(event, ['youtube_video_urls', 'youtube_videos', 'videos'])
      .map((item, index) => normalizeMedia(item, 'Video', index))
      .filter(isPresent),
  }
}

export function hasEventGalleryContent(gallery: EventGalleryContent) {
  return Boolean(
    gallery.aftermovie ||
      gallery.externalLinks.length > 0 ||
      gallery.instagramReels.length > 0 ||
      gallery.photos.length > 0 ||
      gallery.youtubeVideos.length > 0,
  )
}
