export type SpotifyTrack = {
  title: string
  mood: string
  duration: string
}

export type Artist = {
  id: string
  name: string
  role: string
  imagePath: string
  tracks: SpotifyTrack[]
}

export const artists: Artist[] = [
  {
    id: 'vektorben',
    name: 'Vektorben',
    role: 'Urbano experimental',
    imagePath: '/assets/artists/vektorben-hero.png',
    tracks: [
      { title: 'Frecuencia Central', mood: 'Trap melodico', duration: '3:08' },
      { title: 'Neon Sur', mood: 'Club nocturno', duration: '2:54' },
      { title: 'Pulso 777', mood: 'Energia alta', duration: '3:21' },
    ],
  },
  {
    id: 'giovan-e',
    name: 'Giovan-e',
    role: 'Urbano latino',
    imagePath: '/assets/artists/giovan-e-hero.png',
    tracks: [
      { title: 'Ruta de Luz', mood: 'Reggaeton fino', duration: '2:48' },
      { title: 'Modo Vision', mood: 'Urbano premium', duration: '3:16' },
      { title: 'Kilometros', mood: 'Mid tempo', duration: '3:02' },
    ],
  },
  {
    id: 'astes',
    name: 'Astes',
    role: 'Rap y lirica urbana',
    imagePath: '/assets/artists/astes-hero.png',
    tracks: [
      { title: 'Codigo Barrio', mood: 'Rap directo', duration: '2:58' },
      { title: 'Casa Matriz', mood: 'Historia local', duration: '3:34' },
      { title: 'Sin Ruido', mood: 'Minimal oscuro', duration: '3:10' },
    ],
  },
]
