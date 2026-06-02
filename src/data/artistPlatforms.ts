export type ArtistPlatform = 'spotify' | 'tiktok' | 'instagram' | 'appleMusic' | 'amazonMusic' | 'youtube'

export type ArtistPlatformLink = {
  href: string
  platform: ArtistPlatform
}

type ArtistPlatformProfile = {
  links: ArtistPlatformLink[]
}

export const artistPlatformProfiles: Record<string, ArtistPlatformProfile> = {
  vektorben: {
    links: [
      {
        platform: 'spotify',
        href: 'https://open.spotify.com/intl-es/artist/60f1mSGeUUhevHXVgZpAii?si=7rjKhyVfQ4Onh3NSoFW45w',
      },
      { platform: 'tiktok', href: 'https://www.tiktok.com/@vektorbenlavision' },
      { platform: 'instagram', href: 'https://www.instagram.com/vektorbenlavision/' },
      { platform: 'appleMusic', href: 'https://music.apple.com/us/artist/vektorben/1518007114' },
      { platform: 'amazonMusic', href: 'https://music.amazon.com/artists/B08B2RHY69/vektorben' },
      { platform: 'youtube', href: 'https://www.youtube.com/@Vektorben' },
    ],
  },
  'giovan-e': {
    links: [
      {
        platform: 'spotify',
        href: 'https://open.spotify.com/intl-es/artist/41BsWiQu4cfQoSSiohNba6?si=JI0DucjbSJWWIYgrvKMXdQ',
      },
      { platform: 'tiktok', href: 'https://www.tiktok.com/@giovan.e' },
      { platform: 'instagram', href: 'https://www.instagram.com/il.giovan.e/' },
      { platform: 'appleMusic', href: 'https://music.apple.com/us/artist/giovan-e/1474278863' },
      { platform: 'amazonMusic', href: 'https://music.amazon.com/artists/B07VMQLBR8/giovan-e' },
      { platform: 'youtube', href: 'https://www.youtube.com/channel/UChU4UU2EPwutpxHD9EUmPYg' },
    ],
  },
}

const artistHeroOpenLabelKeys: Record<ArtistPlatform, string> = {
  spotify: 'hero.open-spotify',
  tiktok: 'hero.open-tiktok',
  instagram: 'hero.open-instagram',
  appleMusic: 'hero.open-apple-music',
  amazonMusic: 'hero.open-amazon-music',
  youtube: 'hero.open-youtube',
}

const artistProfileLabelKeys: Record<ArtistPlatform, string> = {
  spotify: 'artists.profile.spotify',
  tiktok: 'artists.profile.tiktok',
  instagram: 'artists.profile.instagram',
  appleMusic: 'artists.profile.apple-music',
  amazonMusic: 'artists.profile.amazon-music',
  youtube: 'artists.profile.youtube',
}

export function getArtistPlatformLinks(artistId: string) {
  return artistPlatformProfiles[artistId]?.links.filter((link) => Boolean(link.href)) ?? []
}

export function getArtistSocialLinks(artistId: string) {
  return getArtistPlatformLinks(artistId).filter((link) => link.platform !== 'spotify')
}

export function getArtistSpotifyProfileUrl(artistId: string) {
  return getArtistPlatformLinks(artistId).find((link) => link.platform === 'spotify')?.href
}

export function getArtistHeroOpenLabelKey(platform: ArtistPlatform) {
  return artistHeroOpenLabelKeys[platform]
}

export function getArtistProfileLabelKey(platform: ArtistPlatform) {
  return artistProfileLabelKeys[platform]
}
