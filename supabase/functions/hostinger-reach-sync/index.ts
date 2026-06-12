import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type TemplateVariables = Record<string, unknown>

type ReachRecipient = {
  id: string
  booking_id: string | null
  client_id: string | null
  recipient_email: string
  recipient_name: string | null
  template_key: string
  event_type: string
  template_variables: TemplateVariables | null
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const reachApiToken = Deno.env.get('HOSTINGER_REACH_API_TOKEN') ?? ''
const reachContactsUrl = Deno.env.get('HOSTINGER_REACH_CONTACTS_URL') ?? ''
const syncSecret = Deno.env.get('HOSTINGER_REACH_SYNC_SECRET') ?? ''

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    status,
  })
}

function stringValue(value: unknown) {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

function splitName(fullName: string | null, email: string) {
  const fallbackName = email.split('@')[0] || email
  const parts = (fullName || fallbackName).trim().split(/\s+/).filter(Boolean)
  const name = parts.shift() || fallbackName
  const surname = parts.join(' ')

  return { name, surname }
}

function buildReachNote(recipient: ReachRecipient) {
  const variables = recipient.template_variables ?? {}
  const noteParts = [
    stringValue(variables.community_consent) === 'true' ? 'Comunidad Onda' : '',
    'Reservas Onda',
    `booking_id=${stringValue(variables.booking_id) || recipient.booking_id || ''}`,
    `servicio=${stringValue(variables.service_name)}`,
    `estudio=${stringValue(variables.studio_name)}`,
    `responsable=${stringValue(variables.producer_name)}`,
    `fecha=${stringValue(variables.booking_date)}`,
    `hora=${stringValue(variables.start_time)}-${stringValue(variables.end_time)}`,
    `pago=${stringValue(variables.payment_status)}`,
    `descuento=${stringValue(variables.discount_code)}`,
  ]

  return noteParts.filter((part) => part && !part.endsWith('=')).join(' | ')
}

async function logEmail(recipient: ReachRecipient, status: 'failed' | 'synced', errorMessage?: string, providerMessageId?: string) {
  await supabase.from('email_logs').insert({
    booking_id: recipient.booking_id,
    client_id: recipient.client_id,
    error_message: errorMessage ?? null,
    provider: 'hostinger_reach',
    provider_message_id: providerMessageId ?? null,
    recipient_email: recipient.recipient_email,
    recipient_name: recipient.recipient_name,
    sent_at: status === 'synced' ? new Date().toISOString() : null,
    status,
    template_key: recipient.template_key,
  })
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Supabase service credentials are not configured.' }, 500)
  }

  if (syncSecret) {
    const authorization = request.headers.get('authorization') ?? ''
    const token = authorization.replace(/^Bearer\s+/i, '').trim()

    if (token !== syncSecret) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }
  }

  if (!reachApiToken || !reachContactsUrl) {
    return jsonResponse({
      error: 'Hostinger Reach API settings are missing.',
      required: ['HOSTINGER_REACH_API_TOKEN', 'HOSTINGER_REACH_CONTACTS_URL'],
    }, 500)
  }

  const { data, error } = await supabase
    .from('booking_email_recipients')
    .select('id, booking_id, client_id, recipient_email, recipient_name, template_key, event_type, template_variables')
    .eq('reach_sync_status', 'pending')
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) {
    return jsonResponse({ error: error.message }, 500)
  }

  const recipients = (data ?? []) as ReachRecipient[]
  let synced = 0
  let failed = 0

  for (const recipient of recipients) {
    const { name, surname } = splitName(recipient.recipient_name, recipient.recipient_email)
    const payload = {
      email: recipient.recipient_email,
      name,
      surname,
      note: buildReachNote(recipient),
    }

    try {
      const reachResponse = await fetch(reachContactsUrl, {
        body: JSON.stringify(payload),
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${reachApiToken}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })

      const responseText = await reachResponse.text()
      let responseBody: Record<string, unknown> = {}

      if (responseText) {
        try {
          responseBody = JSON.parse(responseText) as Record<string, unknown>
        } catch {
          responseBody = { raw: responseText }
        }
      }
      const providerMessageId =
        typeof responseBody.id === 'string'
          ? responseBody.id
          : typeof responseBody.contact_id === 'string'
            ? responseBody.contact_id
            : null

      if (!reachResponse.ok) {
        throw new Error(responseBody.message?.toString() || responseText || `Reach responded with ${reachResponse.status}`)
      }

      await supabase
        .from('booking_email_recipients')
        .update({
          last_synced_at: new Date().toISOString(),
          reach_contact_id: providerMessageId,
          reach_sync_status: 'synced',
        })
        .eq('id', recipient.id)

      await logEmail(recipient, 'synced', undefined, providerMessageId ?? undefined)
      synced += 1
    } catch (syncError) {
      const errorMessage = syncError instanceof Error ? syncError.message : 'Unknown Reach sync error.'

      await supabase
        .from('booking_email_recipients')
        .update({
          last_synced_at: new Date().toISOString(),
          reach_sync_status: 'failed',
        })
        .eq('id', recipient.id)

      await logEmail(recipient, 'failed', errorMessage)
      failed += 1
    }
  }

  return jsonResponse({ failed, pending: recipients.length, synced })
})

// Hostinger Reach POST /contacts only syncs contact data and a reservation note.
// Real personalized email delivery still requires a compatible Reach automation
// (segment/trigger), a transactional email provider, or a dedicated campaigns API
// endpoint if Hostinger enables one for this account/plan.
