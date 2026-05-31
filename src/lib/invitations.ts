import QRCode from 'qrcode'

export const INVITATION_TEMPLATE_BUCKET = 'invitation-templates'
export const GENERATED_INVITATIONS_BUCKET = 'generated-invitations'

export type InvitationQrBox = {
  height: number
  width: number
  x: number
  y: number
}

export type InvitationAccessCodePlacement = {
  color: string
  fontSize: number
  shadowColor: string
  x: number
  y: number
}

type InvitationFileNameInput = {
  accessCode?: string | null
  firstName?: string | null
  fullName?: string | null
  lastName?: string | null
  qrToken?: string | null
}

type InvitationStoragePathInput = InvitationFileNameInput & {
  attendeeId: string
  eventId: string
  timestamp: number
}

type InvitationRenderInput = {
  accessCode?: string
  qrBox: InvitationQrBox
  qrPayload: string
  templateUrl: string
}

export const DEFAULT_QR_BOX: InvitationQrBox = {
  height: 320,
  width: 320,
  x: 80,
  y: 80,
}

function finiteNumber(value: unknown, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function normalizeQrBox(value: Partial<Record<keyof InvitationQrBox, unknown>>) {
  const x = Math.max(0, Math.round(finiteNumber(value.x, DEFAULT_QR_BOX.x)))
  const y = Math.max(0, Math.round(finiteNumber(value.y, DEFAULT_QR_BOX.y)))
  const width = Math.max(32, Math.round(finiteNumber(value.width, DEFAULT_QR_BOX.width)))
  const height = Math.max(32, Math.round(finiteNumber(value.height, DEFAULT_QR_BOX.height)))

  return { height, width, x, y }
}

export function buildAdminCheckInUrl(qrToken: string, eventId?: string) {
  const params = new URLSearchParams({ token: qrToken })

  if (eventId) {
    params.set('eventId', eventId)
  }

  return `${window.location.origin}/admin/check-in?${params.toString()}`
}

export function buildAttendeeFullName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim()
}

export function sanitizeFileName(fileName: string) {
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function sanitizeCodeSegment(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase()
}

function getInvitationCodeSegment(accessCode?: string | null, qrToken?: string | null) {
  const code = sanitizeCodeSegment(accessCode?.trim() ?? '')

  if (code) return code

  const tokenFallback = sanitizeCodeSegment((qrToken?.trim() ?? '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6))

  return tokenFallback || 'SIN-CODIGO'
}

function getAttendeeSlug({ firstName, fullName, lastName }: InvitationFileNameInput) {
  const firstLastName = buildAttendeeFullName(firstName ?? '', lastName ?? '')
  return sanitizeFileName(firstLastName || fullName || '') || 'asistente'
}

export function buildInvitationFileName(input: InvitationFileNameInput) {
  return `${getAttendeeSlug(input)}-invitation-${getInvitationCodeSegment(input.accessCode, input.qrToken)}.png`
}

export function buildInvitationStoragePath({
  attendeeId,
  eventId,
  timestamp,
  ...fileNameInput
}: InvitationStoragePathInput) {
  const attendeeSlug = getAttendeeSlug(fileNameInput)
  const codeSegment = getInvitationCodeSegment(fileNameInput.accessCode, fileNameInput.qrToken)

  return `events/${eventId}/attendees/${attendeeId}/${timestamp}-${attendeeSlug}-${codeSegment}-invitation.png`
}

export async function createQrDataUrl(qrPayload: string, size = 1024) {
  return QRCode.toDataURL(qrPayload, {
    color: {
      dark: '#050505',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
    margin: 1,
    width: size,
  })
}

export async function createQrBlob(qrPayload: string, size = 1024) {
  const dataUrl = await createQrDataUrl(qrPayload, size)
  const response = await fetch(dataUrl)

  return response.blob()
}

export function getAccessCodeText(accessCode: string) {
  return `C\u00d3DIGO: ${accessCode}`
}

export function getAccessCodePlacement(canvasWidth: number, canvasHeight: number): InvitationAccessCodePlacement {
  return {
    color: '#ffffff',
    fontSize: Math.max(18, Math.round(canvasWidth * 0.025)),
    shadowColor: 'rgba(0, 0, 0, 0.82)',
    x: Math.max(24, Math.round(canvasWidth * 0.044)),
    y: Math.max(24, canvasHeight - Math.max(48, Math.round(canvasWidth * 0.067))),
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()

    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('No pudimos cargar la imagen para la invitacion.'))
    image.src = src
  })
}

function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('No pudimos exportar la invitacion como PNG.'))
        return
      }

      resolve(blob)
    }, 'image/png')
  })
}

function drawAccessCode(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement, accessCode: string) {
  const code = accessCode.trim().toUpperCase()

  if (!code) return

  const placement = getAccessCodePlacement(canvas.width, canvas.height)
  const text = getAccessCodeText(code)
  const maxWidth = Math.max(120, canvas.width - placement.x * 2)

  context.save()
  context.font = `700 ${placement.fontSize}px Arial, Helvetica, sans-serif`
  context.fillStyle = placement.color
  context.shadowBlur = Math.max(4, Math.round(placement.fontSize * 0.35))
  context.shadowColor = placement.shadowColor
  context.shadowOffsetX = 1
  context.shadowOffsetY = 2
  context.textAlign = 'left'
  context.textBaseline = 'alphabetic'

  const measuredWidth = context.measureText(text).width

  if (measuredWidth > maxWidth) {
    const nextFontSize = Math.max(14, Math.floor((placement.fontSize * maxWidth) / measuredWidth))
    context.font = `700 ${nextFontSize}px Arial, Helvetica, sans-serif`
  }

  context.lineWidth = Math.max(2, Math.round(placement.fontSize * 0.08))
  context.strokeStyle = 'rgba(0, 0, 0, 0.42)'
  context.strokeText(text, placement.x, placement.y, maxWidth)
  context.fillText(text, placement.x, placement.y, maxWidth)
  context.restore()
}

export async function renderInvitationPng({ accessCode = '', qrBox, qrPayload, templateUrl }: InvitationRenderInput) {
  const templateResponse = await fetch(templateUrl)

  if (!templateResponse.ok) {
    throw new Error('No pudimos descargar la plantilla de invitacion.')
  }

  const templateBlob = await templateResponse.blob()
  const templateObjectUrl = URL.createObjectURL(templateBlob)

  try {
    const templateImage = await loadImage(templateObjectUrl)
    const qrDataUrl = await createQrDataUrl(qrPayload, Math.max(qrBox.width, qrBox.height) * 2)
    const qrImage = await loadImage(qrDataUrl)
    const canvas = document.createElement('canvas')
    const width = templateImage.naturalWidth || templateImage.width
    const height = templateImage.naturalHeight || templateImage.height
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('Canvas no esta disponible en este navegador.')
    }

    canvas.width = width
    canvas.height = height
    context.drawImage(templateImage, 0, 0, width, height)
    context.drawImage(qrImage, qrBox.x, qrBox.y, qrBox.width, qrBox.height)
    drawAccessCode(context, canvas, accessCode)

    return canvasToPngBlob(canvas)
  } finally {
    URL.revokeObjectURL(templateObjectUrl)
  }
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = fileName
  document.body.append(anchor)
  anchor.click()
  anchor.remove()

  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
