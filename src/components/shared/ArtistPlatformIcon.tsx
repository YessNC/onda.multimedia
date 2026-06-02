import type { ArtistPlatform } from '../../data/artistPlatforms'

type PlatformIconProps = {
  className?: string
}

type ArtistPlatformIconProps = PlatformIconProps & {
  platform: ArtistPlatform
}

export function SpotifyIcon({ className = 'h-4 w-4' }: PlatformIconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.59 14.42a.69.69 0 0 1-.95.23c-2.6-1.59-5.88-1.95-9.74-1.07a.69.69 0 1 1-.3-1.35c4.22-.96 7.84-.54 10.76 1.25.32.19.43.62.23.94Zm1.22-2.72a.86.86 0 0 1-1.18.28c-2.98-1.83-7.51-2.36-11.03-1.29a.86.86 0 1 1-.5-1.65c4.02-1.22 9.02-.63 12.43 1.46.4.25.53.78.28 1.2Zm.1-2.83C14.34 8.75 8.45 8.55 5.04 9.59a1.03 1.03 0 1 1-.6-1.97c3.92-1.19 10.43-.96 14.52 1.46a1.03 1.03 0 0 1-1.05 1.79Z" />
    </svg>
  )
}

export function InstagramIcon({ className = 'h-4 w-4' }: PlatformIconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <rect width="16" height="16" x="4" y="4" rx="4.4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16.7" cy="7.35" r="1" fill="currentColor" />
    </svg>
  )
}

export function TikTokIcon({ className = 'h-4 w-4' }: PlatformIconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M16.32 3.5c.43 1.92 1.61 3.27 3.68 3.62v3.12a7.19 7.19 0 0 1-3.66-1.08v5.61c0 3.22-2.08 5.73-5.23 5.73-2.96 0-5.11-1.92-5.11-4.66 0-2.97 2.26-4.9 5.64-4.66v3.17c-1.51-.24-2.44.47-2.44 1.52 0 .86.7 1.46 1.72 1.46 1.2 0 2.02-.83 2.02-2.43V3.5h3.38Z" />
    </svg>
  )
}

export function AppleMusicIcon({ className = 'h-4 w-4' }: PlatformIconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <rect x="4" y="3.8" width="16" height="16.4" rx="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M15.9 7.1v8.08c0 1.32-1.1 2.29-2.48 2.29-1.08 0-1.88-.58-1.88-1.42 0-.97.92-1.7 2.1-1.7.38 0 .76.07 1.08.22V9.1l-5.3.9v6.07c0 1.32-1.1 2.29-2.48 2.29-1.08 0-1.88-.58-1.88-1.42 0-.97.91-1.69 2.1-1.69.38 0 .76.07 1.08.21V8.55l7.66-1.45Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function AmazonMusicIcon({ className = 'h-4 w-4' }: PlatformIconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path
        d="M14.52 16.56c-.68.56-1.56.84-2.64.84-2.02 0-3.35-1.08-3.35-2.73 0-1.92 1.61-2.98 4.64-2.98h1.08v-.61c0-1.02-.62-1.56-1.75-1.56-1.04 0-1.75.42-2.08 1.22l-2.25-.72c.58-1.62 2.16-2.54 4.46-2.54 2.62 0 4.07 1.26 4.07 3.56v3.5c0 .64.08 1.18.24 1.64h-2.42Zm-.27-3.35h-.84c-1.78 0-2.62.44-2.62 1.27 0 .64.55 1.06 1.42 1.06 1.22 0 2.04-.76 2.04-1.83v-.5Z"
        fill="currentColor"
      />
      <path d="M6.8 18.75c3.24 1.88 7.84 1.68 10.88-.4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
      <path d="m16.68 17.27 2.44.12-.98 2.22" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  )
}

export function YouTubeIcon({ className = 'h-4 w-4' }: PlatformIconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path
        d="M21.1 7.2a3.03 3.03 0 0 0-2.13-2.14C17.1 4.56 12 4.56 12 4.56s-5.1 0-6.97.5A3.03 3.03 0 0 0 2.9 7.2C2.5 8.7 2.5 12 2.5 12s0 3.3.4 4.8a3.03 3.03 0 0 0 2.13 2.14c1.87.5 6.97.5 6.97.5s5.1 0 6.97-.5a3.03 3.03 0 0 0 2.13-2.14c.4-1.5.4-4.8.4-4.8s0-3.3-.4-4.8Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="m10.05 14.95 4.95-2.95-4.95-2.95v5.9Z" fill="currentColor" />
    </svg>
  )
}

export default function ArtistPlatformIcon({ className = 'h-4 w-4', platform }: ArtistPlatformIconProps) {
  if (platform === 'spotify') return <SpotifyIcon className={className} />
  if (platform === 'tiktok') return <TikTokIcon className={className} />
  if (platform === 'instagram') return <InstagramIcon className={className} />
  if (platform === 'appleMusic') return <AppleMusicIcon className={className} />
  if (platform === 'amazonMusic') return <AmazonMusicIcon className={className} />

  return <YouTubeIcon className={className} />
}
