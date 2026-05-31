import { supabase } from './supabaseClient'

export type EventStatus = 'draft' | 'upcoming' | 'archived' | 'cancelled'
export type EventVisibility = 'public' | 'private'

export type EventRecord = Record<string, unknown> & {
  cover_image_path?: string | null
  id: string
  deleted_at?: string | null
  description?: string | null
  event_date?: string | null
  image_path?: string | null
  is_published?: boolean | null
  location?: string | null
  published_at?: string | null
  qr_checkin_enabled?: boolean | null
  status?: string | null
  ticket_button_enabled?: boolean | null
  ticket_button_label?: string | null
  ticket_url?: string | null
  title?: string | null
  visibility?: string | null
}

export const DEFAULT_TICKET_LABEL = 'Comprar entradas'
export const EVENT_IMAGES_BUCKET = 'event-images'

export const eventStatusOptions: Array<{ label: string; value: EventStatus }> = [
  { label: 'Borrador', value: 'draft' },
  { label: 'Proximo', value: 'upcoming' },
  { label: 'Archivado', value: 'archived' },
  { label: 'Cancelado', value: 'cancelled' },
]

export const eventVisibilityOptions: Array<{ label: string; value: EventVisibility }> = [
  { label: 'Privado', value: 'private' },
  { label: 'Publico', value: 'public' },
]

const eventStatusLabels: Record<EventStatus, string> = {
  archived: 'Archivado',
  cancelled: 'Cancelado',
  draft: 'Borrador',
  upcoming: 'Publicado',
}

const publicEventStatusLabels: Record<EventStatus, string> = {
  archived: 'Archivo',
  cancelled: 'Cancelado',
  draft: 'Borrador',
  upcoming: 'Proximo',
}

export function readString(value: unknown) {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return ''
}

export function readBoolean(value: unknown) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value.toLowerCase() === 'true'
  if (typeof value === 'number') return value === 1
  return false
}

export function readFirstText(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = readString(row[key])

    if (value) return value
  }

  return ''
}

export function nullableText(value: string) {
  const trimmed = value.trim()
  return trimmed || null
}

export function getEventTitle(event: Record<string, unknown> | null | undefined) {
  if (!event) return 'Evento'

  return readFirstText(event, ['title', 'name', 'event_name', 'slug']) || `Evento ${readString(event.id)}`
}

export function getEventDescription(event: Record<string, unknown> | null | undefined) {
  if (!event) return ''
  return readFirstText(event, ['description', 'summary', 'details'])
}

export function getEventLocation(event: Record<string, unknown> | null | undefined) {
  if (!event) return ''
  return readFirstText(event, ['location', 'place', 'venue'])
}

export function getEventDateRaw(event: Record<string, unknown> | null | undefined) {
  if (!event) return ''
  return readFirstText(event, ['event_date', 'starts_at', 'start_date', 'date', 'created_at'])
}

export function getEventDateInputValue(event: Record<string, unknown> | null | undefined) {
  const value = getEventDateRaw(event)

  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  return date.toISOString().slice(0, 10)
}

export function formatEventDate(value: string) {
  if (!value) return 'Sin fecha'

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value
  const date = new Date(normalized)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
  }).format(date)
}

export function getEventStatus(event: Record<string, unknown> | null | undefined): EventStatus {
  const status = readString(event?.status).toLowerCase()

  if (status === 'draft' || status === 'upcoming' || status === 'archived' || status === 'cancelled') {
    return status
  }

  return readBoolean(event?.is_published) ? 'upcoming' : 'draft'
}

export function getEventStatusLabel(event: Record<string, unknown> | null | undefined) {
  return eventStatusLabels[getEventStatus(event)]
}

export function getPublicEventStatusLabel(event: Record<string, unknown> | null | undefined) {
  return publicEventStatusLabels[getEventStatus(event)]
}

export function getEventVisibility(event: Record<string, unknown> | null | undefined): EventVisibility {
  return readString(event?.visibility).toLowerCase() === 'public' ? 'public' : 'private'
}

export function getEventVisibilityLabel(event: Record<string, unknown> | null | undefined) {
  return getEventVisibility(event) === 'public' ? 'Publico' : 'Privado'
}

export function isEventDeleted(event: Record<string, unknown> | null | undefined) {
  return Boolean(readString(event?.deleted_at))
}

export function isEventPublished(event: Record<string, unknown> | null | undefined) {
  if (!event || isEventDeleted(event)) return false

  const status = getEventStatus(event)
  return status === 'upcoming' || (!readString(event.status) && readBoolean(event.is_published))
}

export function getEventImagePath(event: Record<string, unknown> | null | undefined) {
  if (!event) return ''
  return readFirstText(event, ['image_path', 'cover_image_path', 'cover_url', 'image_url', 'poster_url'])
}

export function getEventCoverImageUrl(path: string) {
  const normalizedPath = readString(path)

  if (!normalizedPath) return ''
  if (/^(https?:|data:|blob:)/i.test(normalizedPath) || normalizedPath.startsWith('/')) return normalizedPath

  return supabase.storage.from(EVENT_IMAGES_BUCKET).getPublicUrl(normalizedPath).data.publicUrl
}

export function getEventImageSource(event: Record<string, unknown> | null | undefined) {
  return getEventCoverImageUrl(getEventImagePath(event))
}

export function getTicketButtonLabel(event: Record<string, unknown> | null | undefined) {
  return readString(event?.ticket_button_label) || DEFAULT_TICKET_LABEL
}

export function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function hasActiveTicketButton(event: Record<string, unknown> | null | undefined) {
  if (!event || getEventVisibility(event) !== 'public') return false

  const ticketUrl = readString(event.ticket_url)
  return readBoolean(event.ticket_button_enabled) && Boolean(ticketUrl) && isValidHttpUrl(ticketUrl)
}

export function compareEventsByDate(first: Record<string, unknown>, second: Record<string, unknown>) {
  const firstDate = new Date(getEventDateRaw(first)).getTime()
  const secondDate = new Date(getEventDateRaw(second)).getTime()

  if (Number.isNaN(firstDate) && Number.isNaN(secondDate)) return 0
  if (Number.isNaN(firstDate)) return 1
  if (Number.isNaN(secondDate)) return -1

  return firstDate - secondDate
}
