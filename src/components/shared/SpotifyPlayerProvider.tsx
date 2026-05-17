import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { Artist, Track } from '../../data/artists'
import { SpotifyPlayerContext, type PlayerArtist } from '../../lib/spotifyPlayer.ts'

export default function SpotifyPlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [currentArtist, setCurrentArtist] = useState<PlayerArtist | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  const playTrack = useCallback((track: Track, artist: Artist) => {
    setCurrentTrack(track)
    setCurrentArtist({
      id: artist.id,
      name: artist.name,
      slug: artist.slug,
      spotifyProfileUrl: artist.spotifyProfileUrl,
    })
    setIsOpen(true)
    setIsMinimized(false)
  }, [])

  const closePlayer = useCallback(() => {
    setIsOpen(false)
    setIsMinimized(false)
  }, [])

  const expandPlayer = useCallback(() => {
    setIsOpen(true)
    setIsMinimized(false)
  }, [])

  const toggleMinimized = useCallback(() => {
    setIsMinimized((current) => !current)
  }, [])

  const value = useMemo(
    () => ({
      closePlayer,
      currentArtist,
      currentTrack,
      expandPlayer,
      isMinimized,
      isOpen,
      playTrack,
      toggleMinimized,
    }),
    [closePlayer, currentArtist, currentTrack, expandPlayer, isMinimized, isOpen, playTrack, toggleMinimized],
  )

  return <SpotifyPlayerContext.Provider value={value}>{children}</SpotifyPlayerContext.Provider>
}
