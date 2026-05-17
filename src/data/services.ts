import { AudioLines, CalendarDays, Clapperboard, Mic2 } from 'lucide-react'

export type Service = {
  id: string
  titleKey: string
  summaryKey: string
}

export type ServiceCategory = {
  id: string
  labelKey: string
  descriptionKey: string
  icon: typeof CalendarDays
  services: Service[]
}

export const serviceCategories: ServiceCategory[] = [
  {
    id: 'eventos',
    labelKey: 'service.eventos',
    descriptionKey: 'service.eventos-desc',
    icon: CalendarDays,
    services: [
      {
        id: 'produccion-general',
        titleKey: 'service.produccion-general',
        summaryKey: 'service.produccion-general-desc',
      },
      {
        id: 'escenario',
        titleKey: 'service.escenario-tecnica',
        summaryKey: 'service.escenario-tecnica-desc',
      },
    ],
  },
  {
    id: 'audiovisual',
    labelKey: 'service.audiovisual',
    descriptionKey: 'service.audiovisual-desc',
    icon: Clapperboard,
    services: [
      {
        id: 'videoclips',
        titleKey: 'service.videoclips',
        summaryKey: 'service.videoclips-desc',
      },
      {
        id: 'cobertura',
        titleKey: 'service.cobertura',
        summaryKey: 'service.cobertura-desc',
      },
    ],
  },
  {
    id: 'musical',
    labelKey: 'service.musica',
    descriptionKey: 'service.musica-desc',
    icon: AudioLines,
    services: [
      {
        id: 'produccion-musical',
        titleKey: 'service.produccion-musical',
        summaryKey: 'service.produccion-musical-desc',
      },
      {
        id: 'desarrollo',
        titleKey: 'service.identidad',
        summaryKey: 'service.identidad-desc',
      },
    ],
  },
  {
    id: 'representacion',
    labelKey: 'service.artistas',
    descriptionKey: 'service.artistas-desc',
    icon: Mic2,
    services: [
      {
        id: 'booking',
        titleKey: 'service.booking',
        summaryKey: 'service.booking-desc',
      },
      {
        id: 'estrategia',
        titleKey: 'service.estrategia',
        summaryKey: 'service.estrategia-desc',
      },
    ],
  },
]
