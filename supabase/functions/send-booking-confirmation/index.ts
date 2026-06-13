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
}

const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? ''
const resendFrom = Deno.env.get('RESEND_FROM') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizePayload(payload: BookingConfirmationPayload) {
  const service = readText(payload.service) || readText(payload.bookingType)

  return {
    customerName: readText(payload.customerName) || 'Cliente Onda',
    date: readText(payload.date),
    email: readText(payload.email).toLowerCase(),
    phone: readText(payload.phone),
    producer: readText(payload.producer),
    service,
    studio: readText(payload.studio),
    time: readText(payload.time),
  }
}

function detailRow(label: string, value: string) {
  if (!value) return ''

  return `
    <tr>
      <td style="padding: 12px 16px; color: #b8a8ff; font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; border-bottom: 1px solid rgba(184, 168, 255, 0.16);">${escapeHtml(label)}</td>
      <td style="padding: 12px 16px; color: #f8f7ff; font-size: 15px; border-bottom: 1px solid rgba(184, 168, 255, 0.16);">${escapeHtml(value)}</td>
    </tr>
  `
}

function buildBookingHtml(booking: ReturnType<typeof normalizePayload>) {
  const details = [
    detailRow('Cliente', booking.customerName),
    detailRow('Email', booking.email),
    detailRow('Teléfono', booking.phone),
    detailRow('Servicio', booking.service),
    detailRow('Estudio', booking.studio),
    detailRow('Productor', booking.producer),
    detailRow('Fecha', booking.date),
    detailRow('Hora', booking.time),
  ].join('')

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Confirmación de reserva - Onda Multimedia</title>
  </head>
  <body style="margin: 0; background: #070711; color: #f8f7ff; font-family: Inter, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #070711; padding: 32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 640px; overflow: hidden; border: 1px solid rgba(184, 168, 255, 0.22); border-radius: 18px; background: linear-gradient(145deg, #101025 0%, #161129 55%, #24103d 100%); box-shadow: 0 24px 70px rgba(123, 44, 255, 0.24);">
            <tr>
              <td style="padding: 32px 28px 18px;">
                <p style="margin: 0 0 10px; color: #b8a8ff; font-size: 12px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase;">Onda Multimedia</p>
                <h1 style="margin: 0; color: #ffffff; font-size: 28px; line-height: 1.2;">Tu reserva está confirmada</h1>
                <p style="margin: 18px 0 0; color: #d8d3ea; font-size: 16px; line-height: 1.7;">
                  Gracias por reservar con nosotros, ${escapeHtml(booking.customerName)}. Estos son los detalles de tu sesión:
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 28px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border: 1px solid rgba(184, 168, 255, 0.16); border-radius: 14px; overflow: hidden; background: rgba(7, 7, 17, 0.52);">
                  ${details}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 28px 34px;">
                <p style="margin: 0; color: #d8d3ea; font-size: 15px; line-height: 1.7;">
                  Te esperamos en Onda Multimedia. Si necesitamos coordinar algún detalle adicional, también podemos contactarte por WhatsApp.
                </p>
                <p style="margin: 22px 0 0; color: #ffffff; font-size: 15px; font-weight: 700;">
                  Gracias por confiar en Onda Multimedia.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed', success: false }, 405)
  }

  if (!resendApiKey || !resendFrom) {
    console.error('Resend confirmation email is missing required environment variables.')
    return jsonResponse({ error: 'Email service is not configured.', success: false }, 500)
  }

  let payload: BookingConfirmationPayload

  try {
    payload = (await request.json()) as BookingConfirmationPayload
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.', success: false }, 400)
  }

  const booking = normalizePayload(payload)

  if (!booking.email) {
    return jsonResponse({ error: 'Email is required.', success: false }, 400)
  }

  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      body: JSON.stringify({
        from: resendFrom,
        html: buildBookingHtml(booking),
        subject: 'Confirmación de reserva - Onda Multimedia',
        to: [booking.email],
      }),
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

    if (!resendResponse.ok) {
      console.error('Resend booking confirmation failed:', {
        message: responseBody.message ?? responseBody.error ?? 'Unknown Resend error.',
        status: resendResponse.status,
      })

      return jsonResponse({ error: 'Could not send booking confirmation email.', success: false }, 502)
    }

    return jsonResponse({ id: responseBody.id ?? null, success: true })
  } catch (error) {
    console.error('Unexpected booking confirmation email error:', error instanceof Error ? error.message : error)
    return jsonResponse({ error: 'Could not send booking confirmation email.', success: false }, 500)
  }
})
