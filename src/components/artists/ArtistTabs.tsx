import { useState } from 'react'
import { artists } from '../../data/artists'
import { cn } from '../../lib/utils'
import AssetFrame from '../shared/AssetFrame'
import SpotifyTrackCarousel from './SpotifyTrackCarousel'

export default function ArtistTabs() {
  const [activeArtistId, setActiveArtistId] = useState(artists[0].id)
  const activeArtist = artists.find((artist) => artist.id === activeArtistId) ?? artists[0]

  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-stretch">
      <div className="grid gap-3">
        {artists.map((artist) => (
          <button
            key={artist.id}
            type="button"
            onClick={() => setActiveArtistId(artist.id)}
            className={cn(
              'glass-panel rounded-lg p-4 text-left transition hover:border-onda-purple/45',
              activeArtist.id === artist.id && 'border-onda-purple/55 shadow-[0_0_32px_rgba(123,44,255,0.18)]',
            )}
          >
            <span className="font-display text-sm font-bold uppercase tracking-[0.16em] text-zinc-950 dark:text-white">
              {artist.name}
            </span>
            <span className="mt-2 block text-sm text-zinc-600 dark:text-onda-muted">{artist.role}</span>
          </button>
        ))}
      </div>

      <div className="glass-panel rounded-lg p-4">
        <div className="grid gap-6 lg:grid-cols-[0.72fr_1fr] lg:items-center">
          <AssetFrame src={activeArtist.imagePath} alt={activeArtist.name} className="aspect-[4/5]" />
          <div className="min-w-0">
            <p className="font-display text-xs font-bold uppercase tracking-[0.22em] text-onda-purple dark:text-onda-lavender">
              Catalogo en preparacion
            </p>
            <h3 className="mt-3 font-display text-2xl font-extrabold uppercase tracking-[0.12em] text-zinc-950 dark:text-white">
              {activeArtist.name}
            </h3>
            <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-onda-muted">
              Espacio reservado para integrar Spotify, presskit, fotografia oficial y campañas por artista.
            </p>
            <div className="mt-6">
              <SpotifyTrackCarousel tracks={activeArtist.tracks} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
