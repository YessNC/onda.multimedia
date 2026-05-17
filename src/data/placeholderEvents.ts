export type PlaceholderEvent = {
  id: string
  title: string
  date: string
  place: string
  imagePath: string
  isPublished: boolean
  status: 'proximo' | 'archivo'
}

export const placeholderEvents: PlaceholderEvent[] = [
  {
    id: 'onda-live-01',
    title: 'Onda Live Session',
    date: 'Pronto',
    place: 'Freirina, Chile',
    imagePath: '/assets/events/event-placeholder-01.jpg',
    isPublished: false,
    status: 'proximo',
  },
  {
    id: 'urban-night-02',
    title: 'Urban Night',
    date: 'Por confirmar',
    place: 'Atacama',
    imagePath: '/assets/events/event-placeholder-02.jpg',
    isPublished: false,
    status: 'proximo',
  },
  {
    id: 'studio-showcase-03',
    title: 'Studio Showcase',
    date: 'En agenda',
    place: 'Casa Matriz',
    imagePath: '/assets/events/event-placeholder-03.jpg',
    isPublished: false,
    status: 'archivo',
  },
]
