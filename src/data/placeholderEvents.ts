export type PlaceholderEvent = {
  id: string
  titleKey: string
  dateKey: string
  placeKey: string
  imagePath: string
  isPublished: boolean
  status: 'proximo' | 'archivo'
}

export const placeholderEvents: PlaceholderEvent[] = [
  {
    id: 'onda-live-01',
    titleKey: 'event.onda-session',
    dateKey: 'event.soon',
    placeKey: 'footer.location',
    imagePath: '/assets/events/event-placeholder-01.jpg',
    isPublished: false,
    status: 'proximo',
  },
  {
    id: 'urban-night-02',
    titleKey: 'event.urban-night',
    dateKey: 'event.pending',
    placeKey: 'event.atacama',
    imagePath: '/assets/events/event-placeholder-02.jpg',
    isPublished: false,
    status: 'proximo',
  },
  {
    id: 'studio-showcase-03',
    titleKey: 'event.studio-showcase',
    dateKey: 'event.scheduled',
    placeKey: 'event.casa-matriz',
    imagePath: '/assets/events/event-placeholder-03.jpg',
    isPublished: false,
    status: 'archivo',
  },
]
