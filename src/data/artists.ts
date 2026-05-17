export type Track = {
  id: string
  title: string
  spotifyTrackUrl: string
  spotifyEmbedUrl: string
  coverImage?: string
  audioPreviewUrl?: string | null
  isFeatured: boolean
}

export type Artist = {
  id: string
  name: string
  slug: string
  heroImage: string
  description: string
  heroPhrase: string
  spotifyProfileUrl: string
  spotifyArtistEmbedUrl: string
  tracks: Track[]
}

export const artists: Artist[] = [
  {
    id: 'vektorben',
    name: 'Vektorben',
    slug: 'vektorben',
    heroImage: '/assets/artists/vektorben-portada.webp',
    description: 'Artista urbano parte del universo creativo de ONDA MULTIMEDIA.',
    heroPhrase: 'Sonido urbano con identidad propia.',
    spotifyProfileUrl: 'https://open.spotify.com/intl-es/artist/60f1mSGeUUhevHXVgZpAii?si=UHTTuaz0SX2KV00Os9wIeA',
    spotifyArtistEmbedUrl: 'https://open.spotify.com/embed/artist/60f1mSGeUUhevHXVgZpAii',
    tracks: [
      {
        id: '7HpMOy3vLPjspDy25iOBJE',
        title: 'Toma Tra',
        spotifyTrackUrl: 'https://open.spotify.com/intl-es/track/7HpMOy3vLPjspDy25iOBJE?si=9f697a4c5de54cd0',
        spotifyEmbedUrl: 'https://open.spotify.com/embed/track/7HpMOy3vLPjspDy25iOBJE',
        coverImage: '',
        audioPreviewUrl: null,
        isFeatured: true,
      },
      {
        id: '5dbBqbnbPVSjIitsv45Rcl',
        title: "Sin'Atao",
        spotifyTrackUrl: 'https://open.spotify.com/intl-es/track/5dbBqbnbPVSjIitsv45Rcl?si=8aeb92d0b65544fb',
        spotifyEmbedUrl: 'https://open.spotify.com/embed/track/5dbBqbnbPVSjIitsv45Rcl',
        coverImage: '',
        audioPreviewUrl: null,
        isFeatured: true,
      },
      {
        id: '6wsCiQekAcfLlE3ZzLz2nj',
        title: 'NINFÓMANA',
        spotifyTrackUrl: 'https://open.spotify.com/intl-es/track/6wsCiQekAcfLlE3ZzLz2nj?si=c6960ec2f6ab4845',
        spotifyEmbedUrl: 'https://open.spotify.com/embed/track/6wsCiQekAcfLlE3ZzLz2nj',
        coverImage: '',
        audioPreviewUrl: null,
        isFeatured: true,
      },
    ],
  },
  {
    id: 'giovan-e',
    name: 'Giovan-e',
    slug: 'giovan-e',
    heroImage: '/assets/artists/giovane-portada.webp',
    description: 'Artista urbano parte del catálogo creativo de ONDA MULTIMEDIA.',
    heroPhrase: 'Energía, calle y propuesta musical.',
    spotifyProfileUrl: 'https://open.spotify.com/intl-es/artist/41BsWiQu4cfQoSSiohNba6?si=-LBw624nQpyU16rhX6S6Jg',
    spotifyArtistEmbedUrl: 'https://open.spotify.com/embed/artist/41BsWiQu4cfQoSSiohNba6',
    tracks: [
      {
        id: '5rBHZZNBfqCNN7AOa7QZ4Z',
        title: 'B-A-B-Y',
        spotifyTrackUrl: 'https://open.spotify.com/intl-es/track/5rBHZZNBfqCNN7AOa7QZ4Z?si=7da26c571ab94dc7',
        spotifyEmbedUrl: 'https://open.spotify.com/embed/track/5rBHZZNBfqCNN7AOa7QZ4Z',
        coverImage: '',
        audioPreviewUrl: null,
        isFeatured: true,
      },
    ],
  },
  {
    id: 'astes',
    name: 'Astes',
    slug: 'astes',
    heroImage: '/assets/artists/astes-portada.webp',
    description: 'Artista urbano parte del ecosistema musical de ONDA MULTIMEDIA.',
    heroPhrase: 'Una propuesta fresca para la escena urbana.',
    spotifyProfileUrl: 'https://open.spotify.com/intl-es/artist/67jwyFsdYM27RjZEcc6xUa?si=CopMXQVoRYGQCRLzSntv9w',
    spotifyArtistEmbedUrl: 'https://open.spotify.com/embed/artist/67jwyFsdYM27RjZEcc6xUa',
    tracks: [
      {
        id: '7Lw9OQNqCQpLWzlEbuPgyN',
        title: 'Bien Duro',
        spotifyTrackUrl: 'https://open.spotify.com/intl-es/track/7Lw9OQNqCQpLWzlEbuPgyN?si=4df57e426522441c',
        spotifyEmbedUrl: 'https://open.spotify.com/embed/track/7Lw9OQNqCQpLWzlEbuPgyN',
        coverImage: '',
        audioPreviewUrl: null,
        isFeatured: true,
      },
      {
        id: '5llJdj1FRPsuUbo3Fk5suo',
        title: 'Entre Tres',
        spotifyTrackUrl: 'https://open.spotify.com/intl-es/track/5llJdj1FRPsuUbo3Fk5suo?si=9ba3e59cdf6b4b40',
        spotifyEmbedUrl: 'https://open.spotify.com/embed/track/5llJdj1FRPsuUbo3Fk5suo',
        coverImage: '',
        audioPreviewUrl: null,
        isFeatured: true,
      },
    ],
  },
]
