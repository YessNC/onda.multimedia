import { isUuid, normalizeAccessCode } from './accessCodes'

export type ParsedCheckInQr = {
  accessCode: string
  eventId: string
  token: string
}

function readSearchParam(searchParams: URLSearchParams, keys: string[]) {
  for (const key of keys) {
    const value = searchParams.get(key)?.trim()

    if (value) return value
  }

  return ''
}

export function parseCheckInQrPayload(value: string, baseUrl?: string): ParsedCheckInQr {
  const trimmed = value.trim()
  const origin = baseUrl || (typeof window === 'undefined' ? 'http://localhost' : window.location.origin)

  if (!trimmed) {
    return { accessCode: '', eventId: '', token: '' }
  }

  try {
    const url = new URL(trimmed, origin)
    const token = readSearchParam(url.searchParams, ['token', 'qr_token', 'qrToken'])
    const accessCode = normalizeAccessCode(readSearchParam(url.searchParams, ['access_code', 'accessCode', 'code']))
    const eventId = readSearchParam(url.searchParams, ['eventId', 'event_id'])

    if (token || accessCode || eventId) {
      return {
        accessCode,
        eventId,
        token,
      }
    }
  } catch {
    // Keep going: the payload may be a bare query string or a raw token.
  }

  const queryText = trimmed.startsWith('?') ? trimmed.slice(1) : trimmed

  if (queryText.includes('=')) {
    const searchParams = new URLSearchParams(queryText)
    const token = readSearchParam(searchParams, ['token', 'qr_token', 'qrToken'])
    const accessCode = normalizeAccessCode(readSearchParam(searchParams, ['access_code', 'accessCode', 'code']))
    const eventId = readSearchParam(searchParams, ['eventId', 'event_id'])

    if (token || accessCode || eventId) {
      return {
        accessCode,
        eventId,
        token,
      }
    }
  }

  return {
    accessCode: isUuid(trimmed) ? '' : normalizeAccessCode(trimmed),
    eventId: '',
    token: isUuid(trimmed) ? trimmed : '',
  }
}
