type SpotifyEntityType = 'artist' | 'track'

export type SpotifyOEmbedData = {
  html: string
  iframe_url?: string
  provider_name?: string
  provider_url?: string
  thumbnail_height?: number
  thumbnail_url?: string
  thumbnail_width?: number
  title?: string
  type?: string
  version?: string
}

function getSpotifyEntityId(url: string, entityType: SpotifyEntityType) {
  try {
    const parsedUrl = new URL(url)
    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean)
    const entityIndex = pathSegments.findIndex((segment) => segment === entityType)

    return entityIndex >= 0 ? pathSegments[entityIndex + 1] ?? null : null
  } catch {
    const fallbackMatch = url.match(new RegExp(`${entityType}/([A-Za-z0-9]+)`))
    return fallbackMatch?.[1] ?? null
  }
}

export function getSpotifyTrackId(url: string) {
  return getSpotifyEntityId(url, 'track')
}

export function getSpotifyArtistId(url: string) {
  return getSpotifyEntityId(url, 'artist')
}

export function getSpotifyTrackEmbedUrl(url: string) {
  const trackId = getSpotifyTrackId(url)
  return trackId ? `https://open.spotify.com/embed/track/${trackId}` : null
}

export function getSpotifyArtistEmbedUrl(url: string) {
  const artistId = getSpotifyArtistId(url)
  return artistId ? `https://open.spotify.com/embed/artist/${artistId}` : null
}

// Prepared for a later metadata phase if ONDA decides to read title, iframe html
// or thumbnails from Spotify oEmbed instead of maintaining curated local data.
export async function getSpotifyOEmbedData(url: string) {
  const response = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`)

  if (!response.ok) {
    throw new Error('No se pudo obtener metadata oEmbed de Spotify')
  }

  return (await response.json()) as SpotifyOEmbedData
}
