import { ExternalLink, Maximize2, Minimize2, Music2, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { cn } from '../../lib/utils'
import { useSpotifyPlayer } from '../../lib/spotifyPlayer.ts'

export default function PersistentSpotifyPlayer() {
  const { closePlayer, currentArtist, currentTrack, isMinimized, isOpen, justOpened, toggleMinimized } = useSpotifyPlayer()
  const playerRef = useRef<HTMLElement | null>(null)

  // Scroll suave hacia el player cuando se abre
  useEffect(() => {
    if (isOpen && playerRef.current) {
      setTimeout(() => {
        playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 100)
    }
  }, [isOpen])

  if (!isOpen || !currentTrack || !currentArtist) {
    return null
  }

  return (
    <aside
      ref={playerRef}
      className={cn(
        'fixed bottom-[6.75rem] left-4 right-4 z-40 mx-auto max-w-xl transition-all duration-300 sm:bottom-6 sm:left-6 sm:right-auto sm:mx-0 sm:w-[30rem]',
        isMinimized && 'max-w-md sm:w-[24rem]',
      )}
      aria-label="Reproductor persistente Spotify"
      aria-live="polite"
    >
      <div
        className={cn(
          'overflow-hidden rounded-lg border border-onda-purple/30 bg-white/88 shadow-[0_24px_80px_rgba(123,44,255,0.22)] backdrop-blur-3xl transition-all duration-500 dark:border-onda-lavender/30 dark:bg-onda-black/88 dark:shadow-[0_24px_90px_rgba(123,44,255,0.32)]',
          justOpened && 'border-onda-purple shadow-[0_24px_120px_rgba(123,44,255,0.48)] dark:shadow-[0_24px_140px_rgba(123,44,255,0.64)]',
        )}
      >
        <div className="flex items-center gap-3 border-b border-onda-purple/12 p-3 dark:border-white/10">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-onda-purple text-white shadow-[0_0_28px_rgba(123,44,255,0.36)]">
            <Music2 className="h-5 w-5" aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-950 dark:text-white">
              {currentTrack.title}
            </p>
            <p className="mt-1 truncate text-xs font-semibold text-zinc-600 dark:text-onda-muted">{currentArtist.name}</p>
          </div>

          <div className="flex items-center gap-1">
            <a
              href={currentTrack.spotifyTrackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-onda-purple/20 text-onda-purple transition hover:border-onda-purple hover:bg-onda-purple/10 dark:border-white/10 dark:text-onda-lavender dark:hover:bg-white/10"
              aria-label={`Abrir ${currentTrack.title} en Spotify`}
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
            <button
              type="button"
              onClick={toggleMinimized}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-onda-purple/20 text-onda-purple transition hover:border-onda-purple hover:bg-onda-purple/10 dark:border-white/10 dark:text-onda-lavender dark:hover:bg-white/10"
              aria-label={isMinimized ? 'Expandir reproductor Spotify' : 'Minimizar reproductor Spotify'}
            >
              {isMinimized ? (
                <Maximize2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Minimize2 className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={closePlayer}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-onda-purple/20 text-onda-purple transition hover:border-onda-purple hover:bg-onda-purple/10 dark:border-white/10 dark:text-onda-lavender dark:hover:bg-white/10"
              aria-label="Cerrar reproductor Spotify"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div
          className={cn(
            'grid transition-[grid-template-rows,opacity] duration-300',
            isMinimized ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100',
          )}
        >
          <div className="min-h-0 overflow-hidden">
            {justOpened && (
              <div className="animate-in fade-in duration-300 bg-onda-purple/20 px-3 py-2 text-center text-xs font-semibold text-onda-purple dark:bg-onda-purple/20 dark:text-onda-lavender">
                👆 Presiona el botón play para escuchar
              </div>
            )}
            <div className="p-3">
              {/* Spotify Embed does not expose real volume control here. Advanced volume/playback controls require Spotify Web Playback SDK with OAuth/Premium or authorized first-party audio files. */}
              <iframe
                title={`${currentTrack.title} - ${currentArtist.name} en Spotify`}
                src={currentTrack.spotifyEmbedUrl}
                width="100%"
                height="152"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                className="block w-full rounded-md border-0"
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
