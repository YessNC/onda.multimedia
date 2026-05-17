import { createContext, useContext } from 'react'
import type { Artist, Track } from '../data/artists'

export type PlayerArtist = Pick<Artist, 'id' | 'name' | 'slug' | 'spotifyProfileUrl'>

export type SpotifyPlayerContextValue = {
  currentArtist: PlayerArtist | null
  currentTrack: Track | null
  isMinimized: boolean
  isOpen: boolean
  justOpened: boolean
  closePlayer: () => void
  expandPlayer: () => void
  playTrack: (track: Track, artist: Artist) => void
  toggleMinimized: () => void
}

export const SpotifyPlayerContext = createContext<SpotifyPlayerContextValue | undefined>(undefined)

export function useSpotifyPlayer() {
  const context = useContext(SpotifyPlayerContext)

  if (!context) {
    throw new Error('useSpotifyPlayer debe usarse dentro de SpotifyPlayerProvider')
  }

  return context
}
