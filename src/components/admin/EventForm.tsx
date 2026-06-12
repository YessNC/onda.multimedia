import { useState } from 'react'
import type { FormEvent } from 'react'
import { CalendarDays, Camera, ExternalLink, Film, Eye, EyeOff, QrCode, Save, Send, Sparkles, Ticket, Video, X } from 'lucide-react'
import CTAButton from '../shared/CTAButton'
import { getEventGalleryContent, getInstagramEmbedUrl, getYouTubeEmbedUrl } from '../../lib/eventGallery'
import {
  DEFAULT_TICKET_LABEL,
  type EventRecord,
  type EventStatus,
  type EventVisibility,
  eventStatusOptions,
  eventVisibilityOptions,
  getEventDateInputValue,
  getEventDescription,
  getEventLocation,
  getEventStatus,
  getEventTitle,
  getEventVisibility,
  getTicketButtonLabel,
  isValidHttpUrl,
  nullableText,
  readBoolean,
  readString,
} from '../../lib/events'
import { supabaseAdmin as supabase } from '../../lib/supabaseAdminClient'

type EventFormState = {
  aftermovieUrl: string
  description: string
  eventDate: string
  externalLinks: string
  galleryPhotoUrls: string
  instagramReelUrls: string
  location: string
  qrCheckinEnabled: boolean
  status: EventStatus
  ticketButtonEnabled: boolean
  ticketButtonLabel: string
  ticketUrl: string
  title: string
  visibility: EventVisibility
  youtubeVideoUrls: string
}

type EventFormProps = {
  initialEvent?: EventRecord | null
  onCancelEdit?: () => void
  onSaved?: (event: EventRecord, action: EventFormSaveAction) => void
}

export type EventFormSaveAction = 'draft' | 'published' | 'updated'

const emptyForm: EventFormState = {
  aftermovieUrl: '',
  description: '',
  eventDate: '',
  externalLinks: '',
  galleryPhotoUrls: '',
  instagramReelUrls: '',
  location: '',
  qrCheckinEnabled: false,
  status: 'draft',
  ticketButtonEnabled: false,
  ticketButtonLabel: DEFAULT_TICKET_LABEL,
  ticketUrl: '',
  title: '',
  visibility: 'private',
  youtubeVideoUrls: '',
}

const labelClassName = 'grid min-w-0 max-w-full gap-2 text-sm font-semibold text-zinc-700 dark:text-onda-soft'
const inputClassName =
  'min-h-12 w-full max-w-full rounded-md border border-onda-purple/25 bg-white/80 px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-onda-purple dark:bg-white/5 dark:text-white dark:placeholder:text-onda-muted/70'

function readTextareaLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function getUrlHostLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '') || 'Link externo'
  } catch {
    return 'Link externo'
  }
}

function formatGalleryLinksForForm(event: EventRecord) {
  return getEventGalleryContent(event).externalLinks.map((link) => `${link.label} | ${link.href}`).join('\n')
}

function parseExternalLinks(value: string) {
  return readTextareaLines(value)
    .map((line) => {
      const separatorIndex = line.indexOf('|')
      const label = separatorIndex >= 0 ? line.slice(0, separatorIndex).trim() : ''
      const href = separatorIndex >= 0 ? line.slice(separatorIndex + 1).trim() : line

      return {
        href,
        label: label || getUrlHostLabel(href),
      }
    })
    .filter((link) => link.href)
}

function buildFormState(event: EventRecord | null | undefined): EventFormState {
  if (!event) return emptyForm

  const visibility = getEventVisibility(event)
  const gallery = getEventGalleryContent(event)

  return {
    aftermovieUrl: gallery.aftermovie?.url ?? '',
    description: getEventDescription(event),
    eventDate: getEventDateInputValue(event),
    externalLinks: formatGalleryLinksForForm(event),
    galleryPhotoUrls: gallery.photos.map((photo) => photo.src).join('\n'),
    instagramReelUrls: gallery.instagramReels.map((reel) => reel.url).join('\n'),
    location: getEventLocation(event),
    qrCheckinEnabled: readBoolean(event.qr_checkin_enabled),
    status: getEventStatus(event),
    ticketButtonEnabled: visibility === 'public' && readBoolean(event.ticket_button_enabled),
    ticketButtonLabel: getTicketButtonLabel(event),
    ticketUrl: readString(event.ticket_url),
    title: getEventTitle(event),
    visibility,
    youtubeVideoUrls: gallery.youtubeVideos.map((video) => video.url).join('\n'),
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Ocurrio un error inesperado.'
}

export default function EventForm({ initialEvent = null, onCancelEdit, onSaved }: EventFormProps) {
  const [form, setForm] = useState<EventFormState>(() => buildFormState(initialEvent))
  const [errorMessage, setErrorMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  const isEditing = Boolean(initialEvent?.id)
  const canUseTickets = form.visibility === 'public'
  const showTicketPreview = canUseTickets && form.ticketButtonEnabled && isValidHttpUrl(form.ticketUrl.trim())

  function updateForm(nextForm: Partial<EventFormState>) {
    setForm((current) => {
      const merged = { ...current, ...nextForm }

      if (merged.visibility === 'private') {
        return {
          ...merged,
          ticketButtonEnabled: false,
          ticketUrl: '',
        }
      }

      return merged
    })
  }

  function validateForm(nextStatus: EventStatus) {
    if (!form.title.trim()) return 'Ingresa el titulo del evento.'
    if (!form.eventDate) return 'Selecciona la fecha del evento.'
    if (!form.location.trim()) return 'Ingresa el lugar del evento.'

    if (form.visibility === 'public' && form.ticketButtonEnabled) {
      if (!form.ticketUrl.trim()) return 'Ingresa la URL de venta de entradas.'
      if (!isValidHttpUrl(form.ticketUrl.trim())) return 'Ingresa una URL valida con http:// o https://.'
    }

    if (form.aftermovieUrl.trim() && !isValidHttpUrl(form.aftermovieUrl.trim())) {
      return 'Ingresa una URL valida para el aftermovie con http:// o https://.'
    }

    const invalidYoutubeUrl = readTextareaLines(form.youtubeVideoUrls).find((url) => !getYouTubeEmbedUrl(url))

    if (invalidYoutubeUrl) return `Revisa la URL de YouTube: ${invalidYoutubeUrl}`

    const invalidInstagramUrl = readTextareaLines(form.instagramReelUrls).find((url) => !getInstagramEmbedUrl(url))

    if (invalidInstagramUrl) return `Revisa la URL de Instagram: ${invalidInstagramUrl}`

    const invalidExternalLink = parseExternalLinks(form.externalLinks).find((link) => !isValidHttpUrl(link.href))

    if (invalidExternalLink) return `Revisa el link externo: ${invalidExternalLink.href}`

    if (nextStatus === 'upcoming' && !form.eventDate) return 'Selecciona una fecha antes de publicar.'

    return ''
  }

  async function saveEvent(action: EventFormSaveAction) {
    const statusOverride = action === 'draft' ? 'draft' : action === 'published' ? 'upcoming' : undefined
    const nextStatus = statusOverride ?? form.status
    const validationMessage = validateForm(nextStatus)

    setErrorMessage('')
    setStatusMessage('')

    if (validationMessage) {
      setErrorMessage(validationMessage)
      return
    }

    setIsSaving(true)

    const isPublic = form.visibility === 'public'
    const nextPublishedAt =
      nextStatus === 'upcoming'
        ? readString(initialEvent?.published_at) || new Date().toISOString()
        : nextStatus === 'draft'
          ? null
          : initialEvent?.published_at ?? null

    const payload = {
      aftermovie_url: nullableText(form.aftermovieUrl),
      description: nullableText(form.description),
      event_date: form.eventDate,
      external_links: parseExternalLinks(form.externalLinks),
      gallery_photos: readTextareaLines(form.galleryPhotoUrls),
      instagram_reel_urls: readTextareaLines(form.instagramReelUrls),
      location: form.location.trim(),
      published_at: nextPublishedAt,
      qr_checkin_enabled: form.qrCheckinEnabled,
      status: nextStatus,
      ticket_button_enabled: isPublic ? form.ticketButtonEnabled : false,
      ticket_button_label: form.ticketButtonLabel.trim() || DEFAULT_TICKET_LABEL,
      ticket_url: isPublic && form.ticketButtonEnabled ? form.ticketUrl.trim() : null,
      title: form.title.trim(),
      visibility: form.visibility,
      youtube_video_urls: readTextareaLines(form.youtubeVideoUrls),
    }

    try {
      const response = isEditing
        ? await supabase.from('events').update(payload).eq('id', initialEvent?.id).select('*').single()
        : await supabase.from('events').insert(payload).select('*').single()

      if (response.error) throw response.error

      const savedEvent = response.data as EventRecord

      setForm(emptyForm)
      setStatusMessage(
        action === 'draft'
          ? 'Borrador guardado correctamente.'
          : action === 'published'
            ? 'Evento publicado correctamente.'
            : 'Cambios guardados correctamente.',
      )
      onSaved?.(savedEvent, action)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void saveEvent(isEditing ? 'updated' : 'draft')
  }

  return (
    <form
      className="glass-panel grid w-full min-w-0 max-w-full gap-5 overflow-hidden rounded-lg border-onda-lavender/30 bg-onda-black/72 p-5 shadow-[0_0_34px_rgba(123,44,255,0.18)]"
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-onda-purple/16 text-onda-lavender">
            <CalendarDays className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-lg font-bold uppercase tracking-[0.14em] text-zinc-950 dark:text-white">
              {isEditing ? 'Editando evento' : 'Nuevo evento'}
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-onda-muted">
              {isEditing ? 'Actualiza este registro sin duplicarlo.' : 'Guarda un borrador o publica una fecha.'}
            </p>
          </div>
        </div>

        {isEditing ? (
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <span className="inline-flex min-h-10 items-center justify-center rounded-md border border-onda-purple/25 bg-onda-purple/10 px-3 py-2 font-display text-[0.62rem] font-bold uppercase tracking-[0.12em] text-onda-purple dark:text-onda-lavender">
              Modo edicion
            </span>
            <button
              type="button"
              onClick={onCancelEdit}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-onda-purple/25 bg-white/70 px-3 py-2 font-display text-[0.62rem] font-bold uppercase tracking-[0.12em] text-onda-purple transition hover:bg-onda-purple hover:text-white dark:bg-white/5 dark:text-onda-soft"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Cancelar edicion
            </button>
          </div>
        ) : null}
      </div>

      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <label className={labelClassName}>
          Titulo
          <input
            type="text"
            value={form.title}
            onChange={(event) => updateForm({ title: event.target.value })}
            className={inputClassName}
            placeholder="Nombre del evento"
            disabled={isSaving}
          />
        </label>

        <label className={labelClassName}>
          Fecha
          <input
            type="date"
            value={form.eventDate}
            onChange={(event) => updateForm({ eventDate: event.target.value })}
            className={inputClassName}
            disabled={isSaving}
          />
        </label>
      </div>

      <label className={labelClassName}>
        Lugar
        <input
          type="text"
          value={form.location}
          onChange={(event) => updateForm({ location: event.target.value })}
          className={inputClassName}
          placeholder="Trap House, Casa Matriz, estudio..."
          disabled={isSaving}
        />
      </label>

      <label className={labelClassName}>
        Descripcion
        <textarea
          rows={4}
          value={form.description}
          onChange={(event) => updateForm({ description: event.target.value })}
          className={inputClassName}
          placeholder="Acceso, contexto o informacion breve del evento."
          disabled={isSaving}
        />
      </label>

      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <label className={labelClassName}>
          Estado
          <select
            value={form.status}
            onChange={(event) => updateForm({ status: event.target.value as EventStatus })}
            className={inputClassName}
            disabled={isSaving}
          >
            {eventStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClassName}>
          Visibilidad
          <select
            value={form.visibility}
            onChange={(event) => updateForm({ visibility: event.target.value as EventVisibility })}
            className={inputClassName}
            disabled={isSaving}
          >
            {eventVisibilityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid min-w-0 gap-3 rounded-lg border border-onda-purple/18 bg-white/58 p-4 dark:bg-white/5">
        <label className="flex items-start gap-3 text-sm font-semibold text-zinc-700 dark:text-onda-soft">
          <input
            type="checkbox"
            checked={form.qrCheckinEnabled}
            onChange={(event) => updateForm({ qrCheckinEnabled: event.target.checked })}
            className="mt-1 h-4 w-4 accent-onda-purple"
            disabled={isSaving}
          />
          <span>
            <span className="flex min-w-0 items-center gap-2 break-words">
              <QrCode className="h-4 w-4 text-onda-purple dark:text-onda-lavender" aria-hidden="true" />
              Activar validacion de entradas con QR
            </span>
          </span>
        </label>
      </div>

      <div className="grid min-w-0 gap-4 rounded-lg border border-onda-purple/18 bg-white/58 p-4 dark:bg-white/5">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex min-w-0 items-center gap-3 text-sm font-semibold text-zinc-700 dark:text-onda-soft">
            <input
              type="checkbox"
              checked={form.ticketButtonEnabled}
              onChange={(event) => updateForm({ ticketButtonEnabled: event.target.checked })}
              className="h-4 w-4 accent-onda-purple"
              disabled={isSaving || !canUseTickets}
            />
            <span className="flex min-w-0 items-center gap-2 break-words">
              <Ticket className="h-4 w-4 text-onda-purple dark:text-onda-lavender" aria-hidden="true" />
              Boton de venta de entradas
            </span>
          </label>
          <span className="inline-flex items-center gap-2 rounded-full border border-onda-purple/20 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-onda-purple dark:text-onda-lavender">
            {canUseTickets ? <Eye className="h-3.5 w-3.5" aria-hidden="true" /> : <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />}
            {canUseTickets ? 'Publico' : 'Privado'}
          </span>
        </div>

        <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <label className={labelClassName}>
            Label
            <input
              type="text"
              value={form.ticketButtonLabel}
              onChange={(event) => updateForm({ ticketButtonLabel: event.target.value })}
              className={inputClassName}
              disabled={isSaving || !canUseTickets || !form.ticketButtonEnabled}
            />
          </label>

          <label className={labelClassName}>
            URL externa
            <input
              type="url"
              value={form.ticketUrl}
              onChange={(event) => updateForm({ ticketUrl: event.target.value })}
              className={inputClassName}
              placeholder="https://ticketera.example/evento"
              disabled={isSaving || !canUseTickets || !form.ticketButtonEnabled}
            />
          </label>
        </div>

        {showTicketPreview ? (
          <a
            href={form.ticketUrl.trim()}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-md bg-onda-purple px-4 py-3 font-display text-xs font-bold uppercase tracking-[0.14em] text-white shadow-[0_0_24px_rgba(123,44,255,0.34)] transition hover:bg-onda-electric"
          >
            <Ticket className="h-4 w-4" aria-hidden="true" />
            {form.ticketButtonLabel.trim() || DEFAULT_TICKET_LABEL}
          </a>
        ) : null}
      </div>

      <div className="grid min-w-0 gap-4 rounded-lg border border-onda-purple/18 bg-white/58 p-4 dark:bg-white/5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-onda-purple/12 text-onda-purple dark:text-onda-lavender">
            <Camera className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h4 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-zinc-950 dark:text-white">
              Galeria post-evento
            </h4>
            <p className="mt-1 text-xs font-semibold leading-6 text-zinc-600 dark:text-onda-muted">
              Registros oficiales visibles en la ficha publica del evento.
            </p>
          </div>
        </div>

        <label className={labelClassName}>
          <span className="flex min-w-0 items-center gap-2 break-words">
            <Sparkles className="h-4 w-4 text-onda-purple dark:text-onda-lavender" aria-hidden="true" />
            Aftermovie destacado
          </span>
          <input
            type="url"
            value={form.aftermovieUrl}
            onChange={(event) => updateForm({ aftermovieUrl: event.target.value })}
            className={inputClassName}
            placeholder="https://youtube.com/watch?v=..."
            disabled={isSaving}
          />
        </label>

        <label className={labelClassName}>
          <span className="flex min-w-0 items-center gap-2 break-words">
            <Camera className="h-4 w-4 text-onda-purple dark:text-onda-lavender" aria-hidden="true" />
            Fotos
          </span>
          <textarea
            rows={3}
            value={form.galleryPhotoUrls}
            onChange={(event) => updateForm({ galleryPhotoUrls: event.target.value })}
            className={inputClassName}
            placeholder="https://cdn.example/evento/foto-01.webp"
            disabled={isSaving}
          />
        </label>

        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <label className={labelClassName}>
            <span className="flex min-w-0 items-center gap-2 break-words">
              <Video className="h-4 w-4 text-onda-purple dark:text-onda-lavender" aria-hidden="true" />
              Videos YouTube
            </span>
            <textarea
              rows={3}
              value={form.youtubeVideoUrls}
              onChange={(event) => updateForm({ youtubeVideoUrls: event.target.value })}
              className={inputClassName}
              placeholder="https://youtu.be/..."
              disabled={isSaving}
            />
          </label>

          <label className={labelClassName}>
            <span className="flex min-w-0 items-center gap-2 break-words">
              <Film className="h-4 w-4 text-onda-purple dark:text-onda-lavender" aria-hidden="true" />
              Reels Instagram
            </span>
            <textarea
              rows={3}
              value={form.instagramReelUrls}
              onChange={(event) => updateForm({ instagramReelUrls: event.target.value })}
              className={inputClassName}
              placeholder="https://www.instagram.com/reel/..."
              disabled={isSaving}
            />
          </label>
        </div>

        <label className={labelClassName}>
          <span className="flex min-w-0 items-center gap-2 break-words">
            <ExternalLink className="h-4 w-4 text-onda-purple dark:text-onda-lavender" aria-hidden="true" />
            Links externos
          </span>
          <textarea
            rows={3}
            value={form.externalLinks}
            onChange={(event) => updateForm({ externalLinks: event.target.value })}
            className={inputClassName}
            placeholder="Resumen del evento | https://example.com"
            disabled={isSaving}
          />
        </label>
      </div>

      {errorMessage ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-200">
          {errorMessage}
        </p>
      ) : null}

      {statusMessage ? (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-200">
          {statusMessage}
        </p>
      ) : null}

      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap">
        {isEditing ? (
          <CTAButton
            type="submit"
            variant="primary"
            icon={<Save className="h-4 w-4" aria-hidden="true" />}
            disabled={isSaving}
            className="sm:flex-1"
          >
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </CTAButton>
        ) : null}
        <CTAButton
          type="button"
          variant={isEditing ? 'secondary' : 'primary'}
          icon={<Save className="h-4 w-4" aria-hidden="true" />}
          onClick={() => void saveEvent('draft')}
          disabled={isSaving}
          className="sm:flex-1"
        >
          {isSaving ? 'Guardando...' : 'Guardar borrador'}
        </CTAButton>
        <CTAButton
          type="button"
          variant="secondary"
          icon={<Send className="h-4 w-4" aria-hidden="true" />}
          onClick={() => void saveEvent('published')}
          disabled={isSaving}
          className="sm:flex-1"
        >
          {isSaving ? 'Publicando...' : 'Publicar'}
        </CTAButton>
      </div>
    </form>
  )
}
