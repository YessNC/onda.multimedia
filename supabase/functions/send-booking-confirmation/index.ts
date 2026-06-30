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
  bookingStatus?: string | null
  currency?: string | null
  depositAmount?: number | string | null
  depositAmountDue?: number | string | null
  discountCode?: string | null
  paymentStatus?: string | null
  totalAmount?: number | string | null
}

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
}

const adminBookingUrl = 'https://ondamultimedia.com/admin'

// Email de notificación por responsable/productor. Dejar vacío hasta confirmar el correo real.
const producerNotificationEmails: Record<string, string> = {
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
    bookingStatus: readText(payload.bookingStatus),
    currency: readText(payload.currency) || 'CLP',
    customerName: readText(payload.customerName),
    date: readText(payload.date),
    depositAmount: payload.depositAmount,
    depositAmountDue: payload.depositAmountDue,
    discountCode: readText(payload.discountCode),
    email: readText(payload.email).toLowerCase(),
    notes: readText(payload.notes),
    paymentStatus: readText(payload.paymentStatus),
    phone: readText(payload.phone),
    producer: readText(payload.producer),
    service,
    studio: readText(payload.studio),
    time: readText(payload.time),
    totalAmount: payload.totalAmount,
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

function formatMoney(value: number | string | null | undefined, currency: string) {
  const amount = typeof value === 'number' ? value : Number(readText(value))

  if (!Number.isFinite(amount) || amount <= 0) return '$0'

  return new Intl.NumberFormat('es-CL', {
    currency: currency || 'CLP',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount)
}

function buildResponsibleTemplateVariables(booking: ReturnType<typeof normalizePayload>) {
  const depositAmount = Number(booking.depositAmountDue ?? booking.depositAmount ?? 0)
  const totalAmount = Number(booking.totalAmount ?? 0)
  const remainingAmount = Math.max(totalAmount - (Number.isFinite(depositAmount) ? depositAmount : 0), 0)

  return {
    ADMIN_BOOKING_URL: adminBookingUrl,
    BOOKING_DATE: booking.date || '-',
    BOOKING_STATUS: booking.bookingStatus || 'Pendiente',
    BOOKING_TIME: booking.time || '-',
    CUSTOMER_EMAIL: booking.email || '-',
    CUSTOMER_NAME: booking.customerName || '-',
    CUSTOMER_PHONE: booking.phone || '-',
    DEPOSIT_AMOUNT: formatMoney(booking.depositAmountDue ?? booking.depositAmount, booking.currency),
    DISCOUNT_CODE: booking.discountCode || 'Sin descuento',
    PAYMENT_STATUS: booking.paymentStatus || 'Pendiente',
    PRODUCER: booking.producer || '-',
    REMAINING_AMOUNT: formatMoney(remainingAmount, booking.currency),
    RESPONSIBLE_NAME: booking.producer || 'Equipo Onda Multimedia',
    SERVICE: booking.service || '-',
    STUDIO: booking.studio || '-',
    TOTAL_AMOUNT: formatMoney(booking.totalAmount, booking.currency),
  }
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
  const resendResponsibleTemplateId = Deno.env.get('RESEND_RESPONSIBLE_TEMPLATE_ID') ?? ''
  const resendContactEmail = Deno.env.get('RESEND_CONTACT_EMAIL') ?? ''

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

  const internalRecipients = [resendContactEmail]

  if (booking.producer) {
    const producerKey = normalizeProducerName(booking.producer)
    const producerEmail = producerNotificationEmails[producerKey]

    if (isConfiguredEmail(producerEmail)) {
      internalRecipients.push(producerEmail)
    } else {
      console.warn(`Producer email not configured for: ${booking.producer}`)
    }
  } else {
    console.warn('Producer email not configured for: Por confirmar')
  }

  const responsibleTemplateVariables = buildResponsibleTemplateVariables(booking)
  const internalRecipientsList = uniqueRecipients(internalRecipients)

  if (!resendResponsibleTemplateId) {
    console.warn('Internal booking notification skipped: missing RESEND_RESPONSIBLE_TEMPLATE_ID.')
  } else if (internalRecipientsList.length === 0) {
    console.warn('Internal booking notification skipped: no valid internal recipients configured.')
  } else {
    try {
      console.log('Sending internal booking notification')

      const { resendResponse, responseBody } = await sendResendEmail(resendApiKey, {
        from: resendFrom,
        subject: 'Nueva reserva de estudio - Onda Multimedia',
        template: {
          id: resendResponsibleTemplateId,
          variables: responsibleTemplateVariables,
        },
        to: internalRecipientsList,
      })

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
  }

  if (clientEmailError) {
    return jsonResponse({ error: 'Could not send booking confirmation email.', success: false }, clientEmailError.status ?? 500)
  }

  return jsonResponse({ id: clientEmailId, success: true })
})
