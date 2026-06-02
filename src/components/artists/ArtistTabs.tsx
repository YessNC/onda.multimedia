import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { getArtistPlatformLinks, getArtistProfileLabelKey } from '../../data/artistPlatforms'
import { artists } from '../../data/artists'
import { cn } from '../../lib/utils'
import { useI18n } from '../../hooks/useI18n'
import AssetFrame from '../shared/AssetFrame'
import ArtistPlatformIcon from '../shared/ArtistPlatformIcon'
import CTAButton from '../shared/CTAButton'
import SpotifyTrackCarousel from './SpotifyTrackCarousel'

export default function ArtistTabs() {
  const { t } = useI18n()
  const safeArtists = Array.isArray(artists) ? artists : []
  const firstArtist = safeArtists[0]
  const [activeArtistId, setActiveArtistId] = useState(() => firstArtist?.id ?? '')
  const activeArtist = safeArtists.find((artist) => artist.id === activeArtistId) ?? firstArtist

  if (!activeArtist) {
    return null
  }

  const featuredTracks = (activeArtist.tracks ?? []).filter((track) => track.isFeatured)
  const sharedProfileLinks = getArtistPlatformLinks(activeArtist.id)
  const profileLinks =
    sharedProfileLinks.length > 0
      ? sharedProfileLinks
      : activeArtist.spotifyProfileUrl
        ? [{ platform: 'spotify' as const, href: activeArtist.spotifyProfileUrl }]
        : []

  return (
    <div className="grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start">
      <div
        role="tablist"
        aria-label={t('artists.title')}
        className="flex gap-2 overflow-x-auto rounded-lg border border-onda-purple/20 bg-white/62 p-2 shadow-[0_18px_60px_rgba(123,44,255,0.08)] backdrop-blur-2xl lg:sticky lg:top-28 lg:grid lg:overflow-visible dark:border-onda-lavender/20 dark:bg-onda-black/58"
      >
        {safeArtists.map((artist) => (
          <button
            key={artist.id}
            type="button"
            role="tab"
            aria-selected={activeArtist.id === artist.id}
            onClick={() => setActiveArtistId(artist.id)}
            className={cn(
              'min-w-44 rounded-md border px-4 py-3 text-left transition duration-300 lg:min-w-0',
              activeArtist.id === artist.id
                ? 'border-onda-purple bg-onda-purple text-white shadow-[0_0_28px_rgba(123,44,255,0.28)]'
                : 'border-transparent bg-white/58 text-zinc-700 hover:border-onda-purple/35 hover:text-onda-purple dark:bg-white/[0.04] dark:text-onda-muted dark:hover:text-white',
            )}
          >
            <span className="block font-display text-xs font-extrabold uppercase tracking-[0.16em]">{artist.name}</span>
            <span className="mt-2 block text-xs leading-5 opacity-80">{t(artist.heroPhraseKey)}</span>
          </button>
        ))}
      </div>

      <div className="flex min-w-0 flex-col gap-8">
        <div className="grid w-full min-w-0 gap-6 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:items-center">
          <AssetFrame
            src={activeArtist.heroImage}
            alt={activeArtist.name}
            className="aspect-[4/5] min-h-[24rem] min-w-0 shadow-[0_26px_70px_rgba(123,44,255,0.18)]"
            imageClassName={activeArtist.id === 'vektorben' ? 'object-top' : undefined}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-onda-black/78 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
              <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-onda-lavender">
                ONDA MULTIMEDIA
              </p>
              <p className="mt-2 text-sm font-semibold">{t(activeArtist.heroPhraseKey)}</p>
            </div>
          </AssetFrame>

          <div className="min-w-0">
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-md border border-onda-purple/25 bg-onda-purple/10 text-onda-purple shadow-[0_0_32px_rgba(123,44,255,0.16)] dark:border-onda-lavender/25 dark:bg-onda-purple/18 dark:text-onda-lavender">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="font-display text-xs font-bold uppercase tracking-[0.24em] text-onda-purple dark:text-onda-lavender">
              {t('artist.featured')}
            </p>
            <h3 className="mt-3 font-display text-3xl font-extrabold uppercase tracking-[0.12em] text-zinc-950 sm:text-4xl dark:text-white">
              {activeArtist.name}
            </h3>
            <p className="mt-4 max-w-xl text-base leading-8 text-zinc-600 dark:text-onda-muted">
              {t(activeArtist.descriptionKey)}
            </p>
            {profileLinks.length > 0 ? (
              <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 min-[1180px]:grid-cols-3">
                {profileLinks.map((profileLink) => (
                  <CTAButton
                    key={profileLink.platform}
                    href={profileLink.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="secondary"
                    icon={<ArtistPlatformIcon platform={profileLink.platform} className="h-4 w-4 shrink-0" />}
                    className="h-14 w-full min-w-0 px-3 text-[0.56rem] tracking-[0.12em] sm:px-4 sm:text-[0.6rem]"
                  >
                    {t(getArtistProfileLabelKey(profileLink.platform))}
                  </CTAButton>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div>
          <div className="mb-5 flex items-center justify-between gap-4">
            <h4 className="font-display text-lg font-extrabold uppercase tracking-[0.14em] text-zinc-950 dark:text-white">
              {t('artists.featured')}
            </h4>
            <span className="hidden h-px flex-1 bg-gradient-to-r from-onda-purple/35 to-transparent sm:block" />
          </div>
          <SpotifyTrackCarousel artist={activeArtist} tracks={featuredTracks} />
        </div>
      </div>
    </div>
  )
}
