import QRCode from 'qrcode'

export const INVITATION_TEMPLATE_BUCKET = 'invitation-templates'
export const GENERATED_INVITATIONS_BUCKET = 'generated-invitations'

export type InvitationQrBox = {
  height: number
  width: number
  x: number
  y: number
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
  return `CÓDIGO: ${accessCode}`
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

function drawAccessCode(context: CanvasRenderingContext2D, qrBox: InvitationQrBox, accessCode: string) {
  const code = accessCode.trim().toUpperCase()

  if (!code) return

  const fontSize = Math.max(18, Math.round(qrBox.width * 0.095))
  const text = getAccessCodeText(code)
  const x = qrBox.x + qrBox.width / 2
  const y = qrBox.y + qrBox.height + 34

  context.save()
  context.font = `700 ${fontSize}px Arial, Helvetica, sans-serif`
  context.fillStyle = '#050505'
  context.textAlign = 'center'
  context.textBaseline = 'middle'

  const maxWidth = qrBox.width
  const measuredWidth = context.measureText(text).width

  if (measuredWidth > maxWidth) {
    context.font = `700 ${Math.max(14, Math.floor((fontSize * maxWidth) / measuredWidth))}px Arial, Helvetica, sans-serif`
  }

  context.fillText(text, x, y, maxWidth)
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
    drawAccessCode(context, qrBox, accessCode)

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
