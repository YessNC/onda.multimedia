import { AudioLines, CalendarDays, Clapperboard, Mic2 } from 'lucide-react'

export type Service = {
  id: string
  title: string
  summary: string
}

export type ServiceCategory = {
  id: string
  label: string
  description: string
  icon: typeof CalendarDays
  services: Service[]
}

export const serviceCategories: ServiceCategory[] = [
  {
    id: 'eventos',
    label: 'Eventos',
    description: 'Produccion tecnica, puesta en escena y direccion de experiencias en vivo.',
    icon: CalendarDays,
    services: [
      {
        id: 'produccion-general',
        title: 'Produccion general',
        summary: 'Planificacion, coordinacion, proveedores y ejecucion integral del evento.',
      },
      {
        id: 'escenario',
        title: 'Escenario y tecnica',
        summary: 'Sonido, luces, backline, visuales y soporte de operacion en terreno.',
      },
    ],
  },
  {
    id: 'audiovisual',
    label: 'Audiovisual',
    description: 'Contenido visual para marcas, artistas, eventos y campanas digitales.',
    icon: Clapperboard,
    services: [
      {
        id: 'videoclips',
        title: 'Videoclips y sesiones',
        summary: 'Direccion, rodaje, edicion y piezas listas para plataformas.',
      },
      {
        id: 'cobertura',
        title: 'Cobertura de eventos',
        summary: 'Registro multicamara, aftermovies, reels y fotografia editorial.',
      },
    ],
  },
  {
    id: 'musical',
    label: 'Musica',
    description: 'Desarrollo sonoro, grabacion, mezcla y direccion artistica.',
    icon: AudioLines,
    services: [
      {
        id: 'produccion-musical',
        title: 'Produccion musical',
        summary: 'Beats, arreglos, grabacion vocal y postproduccion.',
      },
      {
        id: 'desarrollo',
        title: 'Desarrollo de identidad',
        summary: 'Acompanamiento creativo para encontrar una propuesta artistica solida.',
      },
    ],
  },
  {
    id: 'representacion',
    label: 'Artistas',
    description: 'Representacion y estrategia para talentos urbanos emergentes.',
    icon: Mic2,
    services: [
      {
        id: 'booking',
        title: 'Booking y shows',
        summary: 'Gestion de fechas, oportunidades y coordinacion de presentaciones.',
      },
      {
        id: 'estrategia',
        title: 'Estrategia artistica',
        summary: 'Plan de lanzamientos, contenido, imagen y crecimiento de audiencia.',
      },
    ],
  },
]
