import { Music2, Play } from 'lucide-react'
import type { SpotifyTrack } from '../../data/artists'

type SpotifyTrackCardProps = {
  track: SpotifyTrack
}

export default function SpotifyTrackCard({ track }: SpotifyTrackCardProps) {
  return (
    <article className="glass-panel flex min-h-36 flex-col justify-between rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-md bg-onda-purple/10 p-2 text-onda-purple dark:bg-onda-purple/20 dark:text-onda-lavender">
          <Music2 className="h-5 w-5" aria-hidden="true" />
        </div>
        <span className="text-xs text-zinc-500 dark:text-onda-muted">{track.duration}</span>
      </div>
      <div>
        <h4 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-zinc-950 dark:text-white">
          {track.title}
        </h4>
        <p className="mt-2 text-sm text-zinc-600 dark:text-onda-muted">{track.mood}</p>
      </div>
      <button
        type="button"
        className="mt-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-onda-purple text-white transition hover:bg-onda-electric"
        aria-label={`Vista previa de ${track.title}`}
      >
        <Play className="h-4 w-4 fill-current" aria-hidden="true" />
      </button>
    </article>
  )
}
