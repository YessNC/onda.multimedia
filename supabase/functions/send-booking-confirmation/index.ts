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

function normalizePayload(payload: BookingConfirmationPayload) {
  const service = readText(payload.service) || readText(payload.bookingType)

  return {
    customerName: readText(payload.customerName),
    date: readText(payload.date),
    email: readText(payload.email).toLowerCase(),
    phone: readText(payload.phone),
    producer: readText(payload.producer),
    service,
    studio: readText(payload.studio),
    time: readText(payload.time),
  }
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

  if (!booking.email) {
    return jsonResponse({ error: 'Email is required.', success: false }, 400)
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? ''
  const resendFrom = Deno.env.get('RESEND_FROM') ?? ''
  const resendBookingTemplateId = Deno.env.get('RESEND_BOOKING_TEMPLATE_ID') ?? ''

  if (!resendApiKey || !resendFrom || !resendBookingTemplateId) {
    console.error('Resend confirmation email is missing required environment variables.', {
      missing: {
        RESEND_API_KEY: !resendApiKey,
        RESEND_BOOKING_TEMPLATE_ID: !resendBookingTemplateId,
        RESEND_FROM: !resendFrom,
      },
    })
    return jsonResponse({ error: 'Email service is not configured.', success: false }, 500)
  }

  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      body: JSON.stringify({
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
