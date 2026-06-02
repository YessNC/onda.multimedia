import { ExternalLink, Music2, Play } from 'lucide-react'
import type { Artist, Track } from '../../data/artists'
import { useSpotifyPlayer } from '../../lib/spotifyPlayer.ts'
import { useI18n } from '../../hooks/useI18n'
import CTAButton from '../shared/CTAButton'

type SpotifyTrackCardProps = {
  artist: Artist
  track: Track
}

export default function SpotifyTrackCard({ artist, track }: SpotifyTrackCardProps) {
  const { playTrack } = useSpotifyPlayer()
  const { t } = useI18n()
  const trackArtistName = track.artistName ?? artist.name

  return (
    <article className="glass-panel flex min-h-[23rem] flex-col overflow-hidden rounded-lg">
      <div className="flex items-start justify-between gap-4 p-5">
        <div>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-onda-purple/10 text-onda-purple dark:bg-onda-purple/20 dark:text-onda-lavender">
            <Music2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <h4 className="mt-4 font-display text-lg font-extrabold uppercase tracking-[0.12em] text-zinc-950 dark:text-white">
            {track.title}
          </h4>
          <p className="mt-2 text-sm font-semibold text-zinc-600 dark:text-onda-muted">{trackArtistName}</p>
        </div>
        {track.isFeatured ? (
          <span className="rounded-full border border-onda-purple/25 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-onda-purple dark:text-onda-lavender">
            {t('track.featured')}
          </span>
        ) : null} 
      </div>

      <div className="px-5">
        <iframe
          title={`${track.title} - ${trackArtistName} en Spotify`}
          src={track.spotifyEmbedUrl}
          width="100%"
          height="80"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="block w-full rounded-md border-0"
        />
      </div>

      <div className="mt-auto grid gap-3 p-5 md:grid-cols-2">
        <CTAButton
          onClick={() => playTrack(track, artist)}
          icon={<Play className="h-4 w-4 shrink-0 fill-current" aria-hidden="true" />}
          className="h-12 w-full !gap-1.5 whitespace-nowrap !px-2.5 !text-[0.56rem] !tracking-[0.06em] [&>span]:!whitespace-nowrap"
        >
          {t('track.play')}
        </CTAButton>
        <CTAButton
          href={track.spotifyTrackUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="secondary"
          icon={<ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />}
          className="h-12 w-full !gap-1.5 whitespace-nowrap !px-2.5 !text-[0.56rem] !tracking-[0.06em] [&>span]:!whitespace-nowrap"
        >
          {t('track.open-spotify')}
        </CTAButton>
      </div>
    </article>
  )
}
