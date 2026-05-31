import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, KeyboardEvent } from 'react'
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, RefreshCw, Trash2, Upload } from 'lucide-react'
import {
  EVENT_IMAGES_BUCKET,
  type EventRecord,
  getEventCoverImageUrl,
  getEventTitle,
  readString,
} from '../../lib/events'
import { sanitizeFileName } from '../../lib/invitations'
import { supabase } from '../../lib/supabaseClient'
import { cn } from '../../lib/utils'

type UploadState = 'idle' | 'drag-over' | 'uploading' | 'success' | 'error'

type ImageUploaderProps = {
  event?: EventRecord | null
  onEventUpdated?: (event: EventRecord) => void
}

type MetadataInput = {
  eventId: string
  file: File
  path: string
  safeFileName: string
}

const acceptedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'] as const
const maxImageSizeBytes = 10 * 1024 * 1024

const stateStyles: Record<UploadState, string> = {
  error: 'border-red-400/55 bg-red-500/10 text-red-700 dark:text-red-100',
  idle: 'border-onda-purple/35 bg-white/50 text-zinc-600 hover:border-onda-purple hover:bg-onda-purple/10 dark:bg-white/5 dark:text-onda-muted',
  'drag-over':
    'border-onda-lavender bg-onda-purple/16 text-onda-purple shadow-[0_0_30px_rgba(192,132,252,0.25)] dark:text-onda-soft',
  success: 'border-emerald-400/45 bg-emerald-500/10 text-emerald-700 dark:text-emerald-100',
  uploading: 'border-onda-purple bg-onda-purple/14 text-onda-purple dark:text-onda-soft',
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Ocurrio un error inesperado.'
}

function getErrorCode(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code
    return typeof code === 'string' ? code : ''
  }

  return ''
}

function isOptionalEventImagesMissing(error: unknown) {
  const code = getErrorCode(error)
  const message = getErrorMessage(error).toLowerCase()

  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    (message.includes('event_images') && (message.includes('does not exist') || message.includes('schema cache')))
  )
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function validateImageFile(file: File) {
  if (!acceptedMimeTypes.includes(file.type as (typeof acceptedMimeTypes)[number])) {
    return 'Formato no permitido. Usa JPG, PNG o WebP.'
  }

  if (file.size > maxImageSizeBytes) {
    return 'La imagen supera el maximo permitido de 10 MB.'
  }

  return ''
}

async function syncEventImageMetadata({ eventId, file, path, safeFileName }: MetadataInput) {
  const { data: sessionData } = await supabase.auth.getSession()
  const uploadedBy = sessionData.session?.user.id ?? null

  const resetCoverResponse = await supabase
    .from('event_images')
    .update({ is_cover: false })
    .eq('event_id', eventId)
    .eq('is_cover', true)

  if (resetCoverResponse.error) {
    if (isOptionalEventImagesMissing(resetCoverResponse.error)) return ''
    return `La portada se guardo, pero no se pudo actualizar el historial anterior: ${resetCoverResponse.error.message}`
  }

  const insertResponse = await supabase.from('event_images').insert({
    bucket: EVENT_IMAGES_BUCKET,
    event_id: eventId,
    file_name: safeFileName,
    is_cover: true,
    mime_type: file.type,
    path,
    size_bytes: file.size,
    uploaded_by: uploadedBy,
  })

  if (insertResponse.error) {
    if (isOptionalEventImagesMissing(insertResponse.error)) return ''
    return `La portada se guardo, pero no se pudo insertar la metadata: ${insertResponse.error.message}`
  }

  return ''
}

async function clearCoverMetadata(eventId: string) {
  const response = await supabase
    .from('event_images')
    .update({ is_cover: false })
    .eq('event_id', eventId)
    .eq('is_cover', true)

  if (response.error) {
    if (isOptionalEventImagesMissing(response.error)) return ''
    return `La portada se limpio, pero no se pudo actualizar event_images: ${response.error.message}`
  }

  return ''
}

export default function ImageUploader({ event = null, onEventUpdated }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [uploadState, setUploadState] = useState<UploadState>('idle')

  const eventId = event?.id ?? ''
  const eventTitle = getEventTitle(event)
  const coverImagePath = readString(event?.cover_image_path)
  const isUploading = uploadState === 'uploading'
  const isLocked = !eventId || isUploading
  const hasPreview = Boolean(previewUrl)

  useEffect(() => {
    setPreviewUrl(getEventCoverImageUrl(coverImagePath))
  }, [coverImagePath])

  useEffect(() => {
    setErrorMessage('')
    setStatusMessage('')
    setUploadState('idle')
  }, [eventId])

  function showLockedMessage() {
    setErrorMessage('Guarda el evento como borrador antes de subir imagen.')
    setStatusMessage('')
    setUploadState('error')
  }

  function openFileBrowser() {
    if (isLocked) {
      if (!eventId) showLockedMessage()
      return
    }

    fileInputRef.current?.click()
  }

  function handlePickerKeyDown(keyboardEvent: KeyboardEvent<HTMLDivElement>) {
    if (keyboardEvent.key !== 'Enter' && keyboardEvent.key !== ' ') return

    keyboardEvent.preventDefault()
    openFileBrowser()
  }

  function handleDragOver(dragEvent: DragEvent<HTMLDivElement>) {
    dragEvent.preventDefault()

    if (isLocked) return

    setErrorMessage('')
    setUploadState('drag-over')
  }

  function handleDragLeave(dragEvent: DragEvent<HTMLDivElement>) {
    const nextTarget = dragEvent.relatedTarget

    if (nextTarget instanceof Node && dragEvent.currentTarget.contains(nextTarget)) return
    if (uploadState === 'drag-over') setUploadState('idle')
  }

  function handleDrop(dragEvent: DragEvent<HTMLDivElement>) {
    dragEvent.preventDefault()

    if (isLocked) {
      if (!eventId) showLockedMessage()
      return
    }

    const file = dragEvent.dataTransfer.files[0]

    if (file) {
      void uploadImage(file)
    } else {
      setUploadState('idle')
    }
  }

  function handleInputChange(changeEvent: ChangeEvent<HTMLInputElement>) {
    const input = changeEvent.currentTarget
    const file = input.files?.[0]

    if (file) {
      void uploadImage(file)
    }

    input.value = ''
  }

  async function uploadImage(file: File) {
    if (!eventId) {
      showLockedMessage()
      return
    }

    const validationMessage = validateImageFile(file)

    setErrorMessage('')
    setStatusMessage('')

    if (validationMessage) {
      setErrorMessage(validationMessage)
      setUploadState('error')
      return
    }

    const safeFileName = sanitizeFileName(file.name) || 'event-cover'
    const path = `events/${eventId}/${Date.now()}-${safeFileName}`

    setUploadState('uploading')

    try {
      const { error: uploadError } = await supabase.storage.from(EVENT_IMAGES_BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false,
      })

      if (uploadError) throw uploadError

      const { data, error: updateError } = await supabase
        .from('events')
        .update({ cover_image_path: path })
        .eq('id', eventId)
        .select('*')
        .single()

      if (updateError) throw updateError

      const metadataWarning = await syncEventImageMetadata({ eventId, file, path, safeFileName })
      const updatedEvent = data as EventRecord

      onEventUpdated?.(updatedEvent)
      setPreviewUrl(getEventCoverImageUrl(path))
      setStatusMessage(metadataWarning || `Imagen subida correctamente (${formatFileSize(file.size)}).`)
      setUploadState('success')
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
      setUploadState('error')
    }
  }

  async function clearCoverImage() {
    if (!eventId) {
      showLockedMessage()
      return
    }

    setErrorMessage('')
    setStatusMessage('')
    setUploadState('uploading')

    try {
      const { data, error } = await supabase
        .from('events')
        .update({ cover_image_path: null })
        .eq('id', eventId)
        .select('*')
        .single()

      if (error) throw error

      const metadataWarning = await clearCoverMetadata(eventId)
      const updatedEvent = data as EventRecord

      onEventUpdated?.(updatedEvent)
      setPreviewUrl('')
      setStatusMessage(metadataWarning || 'Portada limpiada correctamente.')
      setUploadState('success')
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
      setUploadState('error')
    }
  }

  const stateIcon =
    uploadState === 'uploading' ? (
      <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
    ) : uploadState === 'success' ? (
      <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
    ) : uploadState === 'error' ? (
      <AlertCircle className="h-8 w-8" aria-hidden="true" />
    ) : uploadState === 'drag-over' ? (
      <Upload className="h-8 w-8" aria-hidden="true" />
    ) : (
      <ImagePlus className="h-8 w-8" aria-hidden="true" />
    )

  return (
    <div className="glass-panel grid w-full min-w-0 max-w-full gap-4 overflow-hidden rounded-lg border-onda-lavender/30 bg-onda-black/72 p-5 shadow-[0_0_34px_rgba(123,44,255,0.18)]">
      <div className="flex min-w-0 items-center gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-onda-purple/16 text-onda-lavender">
          <ImagePlus className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-lg font-bold uppercase tracking-[0.14em] text-zinc-950 dark:text-white">
            Imagen del evento
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-onda-muted">
            {eventId ? eventTitle : 'Guarda el evento como borrador antes de subir imagen.'}
          </p>
        </div>
      </div>

      <div
        role="button"
        tabIndex={isLocked ? -1 : 0}
        aria-disabled={isLocked}
        onClick={openFileBrowser}
        onKeyDown={handlePickerKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'grid min-h-56 cursor-pointer place-items-center gap-4 rounded-lg border border-dashed p-4 text-center transition duration-300',
          stateStyles[uploadState],
          isLocked && 'cursor-not-allowed opacity-75',
        )}
      >
        {hasPreview ? (
          <div className="w-full min-w-0 overflow-hidden rounded-md border border-onda-purple/20 bg-onda-black">
            <img src={previewUrl} alt={`Portada de ${eventTitle}`} className="aspect-[16/10] w-full object-cover" />
          </div>
        ) : (
          <div className="grid justify-items-center gap-3">
            {stateIcon}
            <div>
              <p className="font-display text-sm font-bold uppercase tracking-[0.14em] text-zinc-950 dark:text-white">
                {uploadState === 'drag-over'
                  ? 'Suelta la imagen'
                  : uploadState === 'uploading'
                    ? 'Subiendo imagen...'
                    : eventId
                      ? 'Subir portada'
                      : 'Uploader bloqueado'}
              </p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-600 dark:text-onda-muted">
                {eventId
                  ? 'Haz click o arrastra una imagen JPG, PNG o WebP de hasta 10 MB.'
                  : 'Guarda el evento como borrador antes de subir imagen.'}
              </p>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={isLocked}
        onChange={handleInputChange}
      />

      {coverImagePath ? (
        <p className="break-all rounded-md border border-onda-purple/18 bg-white/58 px-3 py-2 text-xs font-semibold text-zinc-600 dark:bg-white/5 dark:text-onda-muted">
          {coverImagePath}
        </p>
      ) : null}

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
        <button
          type="button"
          onClick={openFileBrowser}
          disabled={isLocked}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-onda-purple/35 bg-white/65 px-4 py-3 font-display text-xs font-bold uppercase tracking-[0.14em] text-onda-purple transition hover:border-onda-purple hover:bg-onda-purple/10 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/5 dark:text-onda-soft"
        >
          {hasPreview ? <RefreshCw className="h-4 w-4" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
          {hasPreview ? 'Cambiar imagen' : 'Seleccionar imagen'}
        </button>
        {hasPreview ? (
          <button
            type="button"
            onClick={() => void clearCoverImage()}
            disabled={isUploading}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-red-400/35 bg-red-500/10 px-4 py-3 font-display text-xs font-bold uppercase tracking-[0.14em] text-red-700 transition hover:border-red-400 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-200"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Quitar portada
          </button>
        ) : null}
      </div>
    </div>
  )
}
