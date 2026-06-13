type BookingConfirmationPayload = {
  customerName?: string | null
  email?: string | null
  phone?: string | null
  studio?: string | null
  producer?: string | null
  date?: string | null
  time?: string | null
  service?: string | null
  bookingType?: string | null
  notes?: string | null
}

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
}

const internalBookingNotificationEmail = 'contacto@ondamultimedia.com'

const producerEmails: Record<string, string> = {
  'giovan-e': 'ilgiovane2026@gmail.com',
  'raul allende': 'rnicolas.allende@gmail.com',
  'yessie neira': 'yessie_neira@icloud.com',
  zeta: '',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      'content-type': 'application/json',
    },
    status,
  })
}

function readText(value: unknown) {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

function normalizeProducerName(producer: string | null | undefined) {
  return producer?.trim().toLowerCase() ?? ''
}

function normalizePayload(payload: BookingConfirmationPayload) {
  const service = readText(payload.service) || readText(payload.bookingType)

  return {
    customerName: readText(payload.customerName),
    date: readText(payload.date),
    email: readText(payload.email).toLowerCase(),
    notes: readText(payload.notes),
    phone: readText(payload.phone),
    producer: readText(payload.producer),
    service,
    studio: readText(payload.studio),
    time: readText(payload.time),
  }
}

function isConfiguredEmail(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function uniqueRecipients(recipients: string[]) {
  const seen = new Set<string>()

  return recipients
    .map((recipient) => recipient.trim())
    .filter(isConfiguredEmail)
    .filter((recipient) => {
      const key = recipient.toLowerCase()
      if (seen.has(key)) return false

      seen.add(key)
      return true
    })
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatValue(value: string) {
  return value || 'Por confirmar'
}

function buildInternalBookingNotificationHtml(booking: ReturnType<typeof normalizePayload>) {
  const rows = [
    ['Nombre del cliente', formatValue(booking.customerName)],
    ['Email del cliente', formatValue(booking.email)],
    ['Teléfono', formatValue(booking.phone)],
    ['Servicio', formatValue(booking.service)],
    ['Estudio seleccionado', formatValue(booking.studio)],
    ['Productor seleccionado', formatValue(booking.producer)],
    ['Fecha', formatValue(booking.date)],
    ['Hora', formatValue(booking.time)],
  ]

  if (booking.notes) {
    rows.push(['Notas', booking.notes])
  }

  const rowHtml = rows
    .map(
      ([label, value]) =>
        `<tr><th align="left" style="padding:8px 12px;border-bottom:1px solid #eee;background:#fafafa;">${escapeHtml(label)}</th><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(value)}</td></tr>`,
    )
    .join('')

  return `
    <div style="font-family:Arial,sans-serif;color:#18181b;line-height:1.5;">
      <h1 style="font-size:20px;margin:0 0 12px;">Nueva reserva de estudio</h1>
      <p style="margin:0 0 16px;">Se registró una nueva reserva en Onda Multimedia.</p>
      <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:640px;">
        <tbody>${rowHtml}</tbody>
      </table>
    </div>
  `
}

function buildInternalBookingNotificationText(booking: ReturnType<typeof normalizePayload>) {
  const lines = [
    'Nueva reserva de estudio',
    '',
    `Nombre del cliente: ${formatValue(booking.customerName)}`,
    `Email del cliente: ${formatValue(booking.email)}`,
    `Teléfono: ${formatValue(booking.phone)}`,
    `Servicio: ${formatValue(booking.service)}`,
    `Estudio seleccionado: ${formatValue(booking.studio)}`,
    `Productor seleccionado: ${formatValue(booking.producer)}`,
    `Fecha: ${formatValue(booking.date)}`,
    `Hora: ${formatValue(booking.time)}`,
  ]

  if (booking.notes) {
    lines.push(`Notas: ${booking.notes}`)
  }

  return lines.join('\n')
}

async function sendResendEmail(resendApiKey: string, body: Record<string, unknown>) {
  const resendResponse = await fetch('https://api.resend.com/emails', {
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  const responseText = await resendResponse.text()
  let responseBody: Record<string, unknown> = {}

  if (responseText) {
    try {
      responseBody = JSON.parse(responseText) as Record<string, unknown>
    } catch {
      responseBody = { message: responseText }
    }
  }

  return { resendResponse, responseBody }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed', success: false }, 405)
  }

  let payload: BookingConfirmationPayload

  try {
    payload = (await request.json()) as BookingConfirmationPayload
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.', success: false }, 400)
  }

  const booking = normalizePayload(payload)

  const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? ''
  const resendFrom = Deno.env.get('RESEND_FROM') ?? ''
  const resendBookingTemplateId = Deno.env.get('RESEND_BOOKING_TEMPLATE_ID') ?? ''
  const resendInternalBookingTemplateId = Deno.env.get('RESEND_INTERNAL_BOOKING_TEMPLATE_ID') ?? ''

  if (!resendApiKey || !resendFrom) {
    console.error('Resend email service is missing required environment variables.', {
      missing: {
        RESEND_API_KEY: !resendApiKey,
        RESEND_FROM: !resendFrom,
      },
    })

    return jsonResponse({ error: 'Email service is not configured.', success: false }, 500)
  }

  let clientEmailId: unknown = null
  let clientEmailError: { message: unknown; status?: number } | null = null

  if (booking.email) {
    if (!isConfiguredEmail(booking.email)) {
      clientEmailError = { message: 'Invalid customer email.', status: 400 }
      console.error('Invalid customer email for booking confirmation:', booking.email)
    } else if (!resendBookingTemplateId) {
      clientEmailError = { message: 'Missing RESEND_BOOKING_TEMPLATE_ID.', status: 500 }
      console.error('Resend booking confirmation template is missing.', {
        missing: {
          RESEND_BOOKING_TEMPLATE_ID: true,
        },
      })
    } else {
      try {
        console.log('Sending client booking confirmation')

        const { resendResponse, responseBody } = await sendResendEmail(resendApiKey, {
          from: resendFrom,
          subject: 'Tu reserva está confirmada - Onda Multimedia',
          template: {
            id: resendBookingTemplateId,
            variables: {
              BOOKING_DATE: booking.date || 'Por confirmar',
              BOOKING_TIME: booking.time || 'Por confirmar',
              CUSTOMER_NAME: booking.customerName || 'artista',
              PHONE: booking.phone || 'Por confirmar',
              PRODUCER: booking.producer || 'Por confirmar',
              SERVICE: booking.service || 'Por confirmar',
              STUDIO: booking.studio || 'Por confirmar',
            },
          },
          to: booking.email,
        })

        if (!resendResponse.ok) {
          clientEmailError = {
            message: responseBody.message ?? responseBody.error ?? 'Unknown Resend error.',
            status: resendResponse.status,
          }
          console.error('Resend booking confirmation failed:', clientEmailError)
        } else {
          clientEmailId = responseBody.id ?? null
        }
      } catch (error) {
        clientEmailError = { message: error instanceof Error ? error.message : error }
        console.error('Unexpected booking confirmation email error:', clientEmailError.message)
      }
    }
  } else {
    console.warn('Client booking confirmation skipped because customer email is missing.')
  }

  const internalRecipients = [internalBookingNotificationEmail]

  if (booking.producer) {
    const producerKey = normalizeProducerName(booking.producer)
    const producerEmail = producerEmails[producerKey]

    if (isConfiguredEmail(producerEmail)) {
      internalRecipients.push(producerEmail)
    } else {
      console.warn(`Producer email not configured for: ${booking.producer}`)
    }
  } else {
    console.warn('Producer email not configured for: Por confirmar')
  }

  try {
    console.log('Sending internal booking notification')

    const internalEmailBody: Record<string, unknown> = {
      from: resendFrom,
      subject: 'Nueva reserva de estudio - Onda Multimedia',
      to: uniqueRecipients(internalRecipients),
    }

    if (resendInternalBookingTemplateId) {
      internalEmailBody.template = {
        id: resendInternalBookingTemplateId,
        variables: {
          BOOKING_DATE: booking.date || 'Por confirmar',
          BOOKING_TIME: booking.time || 'Por confirmar',
          CUSTOMER_EMAIL: booking.email || 'Por confirmar',
          CUSTOMER_NAME: booking.customerName || 'Por confirmar',
          NOTES: booking.notes || '',
          PHONE: booking.phone || 'Por confirmar',
          PRODUCER: booking.producer || 'Por confirmar',
          SERVICE: booking.service || 'Por confirmar',
          STUDIO: booking.studio || 'Por confirmar',
        },
      }
    } else {
      internalEmailBody.html = buildInternalBookingNotificationHtml(booking)
      internalEmailBody.text = buildInternalBookingNotificationText(booking)
    }

    const { resendResponse, responseBody } = await sendResendEmail(resendApiKey, internalEmailBody)

    if (!resendResponse.ok) {
      console.error('Internal booking notification failed', {
        message: responseBody.message ?? responseBody.error ?? 'Unknown Resend error.',
        status: resendResponse.status,
      })
    }
  } catch (internalError) {
    console.error(
      'Internal booking notification failed',
      internalError instanceof Error ? internalError.message : internalError,
    )
  }

  if (clientEmailError) {
    return jsonResponse({ error: 'Could not send booking confirmation email.', success: false }, clientEmailError.status ?? 500)
  }

  return jsonResponse({ id: clientEmailId, success: true })
})
