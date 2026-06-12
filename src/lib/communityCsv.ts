export type CommunityCsvAttendee = Record<string, unknown> & {
  accepted_privacy?: boolean | null
  accepted_terms?: boolean | null
  access_code?: string | null
  community_consent?: boolean | string | null
  community_consent_at?: string | null
  community_consent_source?: string | null
  community_welcome_sent?: boolean | null
  community_welcome_sent_at?: string | null
  community_welcome_sent_by?: string | null
  consent_at?: string | null
  created_at?: string | null
  email?: string | null
  first_name?: string | null
  full_name?: string | null
  generated_at?: string | null
  guest_type?: string | null
  instagram_handle?: string | null
  last_name?: string | null
  phone?: string | null
  source?: string | null
  terms_accepted?: boolean | null
  terms_accepted_at?: string | null
  terms_source?: string | null
  ticket_generated_at?: string | null
  updated_at?: string | null
}

export type CommunityCsvContact = {
  'Community': string
  'Consent Accepted': string
  'Date Subscribed': string
  'Email': string
  'First Name': string
  'Full Name': string
  'Instagram': string
  'Last Name': string
  'Occupation': string
  'Phone': string
  'Source': string
  'Ticket Code': string
}

const COMMUNITY_CSV_HEADERS: Array<keyof CommunityCsvContact> = [
  'Email',
  'First Name',
  'Last Name',
  'Date Subscribed',
  'Full Name',
  'Phone',
  'Occupation',
  'Instagram',
  'Ticket Code',
  'Consent Accepted',
  'Community',
  'Source',
]

const UTF8_BOM = '\uFEFF'
const COMMUNITY_ACCEPTED_LABEL = 'S\u00ed'
const COMMUNITY_EVENT_SOURCE = 'ONDA Multimedia - Invitaci\u00f3n evento'
const COMMUNITY_PROFILE_SOURCE = 'dashboard'
const COMMUNITY_IDENTITY_HEADERS: Array<keyof CommunityCsvContact> = [
  'First Name',
  'Last Name',
  'Full Name',
  'Phone',
  'Occupation',
  'Instagram',
  'Ticket Code',
]

function readString(value: unknown) {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return ''
}

function normalizeEmail(value: unknown) {
  return readString(value).toLowerCase()
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isCommunityAccepted(value: unknown) {
  if (value === true) return true
  if (typeof value !== 'string') return false

  const normalized = value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  return ['accepted', 'aceptado', 'si', 'true', 'yes'].includes(normalized)
}

function buildFullName(attendee: CommunityCsvAttendee) {
  const firstName = readString(attendee.first_name)
  const lastName = readString(attendee.last_name)
  const composedName = `${firstName} ${lastName}`.trim()
  const storedName = readString(attendee.full_name)

  if (storedName && storedName.length >= composedName.length) return storedName
  return composedName || storedName
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)

  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  }
}

function getFirstAndLastName(attendee: CommunityCsvAttendee) {
  const fullName = buildFullName(attendee)
  const parsedName = splitName(fullName)
  const storedFirstName = readString(attendee.first_name)
  const storedLastName = readString(attendee.last_name)
  const inferredLastName =
    storedFirstName && fullName.toLowerCase().startsWith(storedFirstName.toLowerCase())
      ? fullName.slice(storedFirstName.length).trim()
      : parsedName.lastName

  return {
    firstName: storedFirstName || parsedName.firstName,
    lastName: storedLastName || inferredLastName,
  }
}

function formatLocalDatePart(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatDateForCsv(value: unknown) {
  const rawValue = readString(value)

  if (!rawValue) return ''

  const date = new Date(rawValue)

  if (Number.isNaN(date.getTime())) return rawValue

  return formatLocalDatePart(date)
}

function getDateSubscribed(attendee: CommunityCsvAttendee) {
  return formatDateForCsv(
    attendee.community_consent_at ||
      attendee.terms_accepted_at ||
      attendee.created_at ||
      attendee.ticket_generated_at ||
      attendee.generated_at ||
      attendee.updated_at,
  )
}

function getCommunitySource(attendee: CommunityCsvAttendee) {
  return (
    readString(attendee.community_consent_source) ||
    readString(attendee.source) ||
    COMMUNITY_EVENT_SOURCE
  )
}

function getContactCompletenessScore(contact: CommunityCsvContact) {
  return COMMUNITY_IDENTITY_HEADERS.reduce(
    (score, header) => score + (readString(contact[header]) ? 1 : 0),
    0,
  )
}

function mergeCommunityCsvContact(existing: CommunityCsvContact, candidate: CommunityCsvContact) {
  const existingScore = getContactCompletenessScore(existing)
  const candidateScore = getContactCompletenessScore(candidate)
  const primary = candidateScore > existingScore ? candidate : existing
  const secondary = primary === candidate ? existing : candidate
  const merged: CommunityCsvContact = { ...primary }

  for (const header of COMMUNITY_IDENTITY_HEADERS) {
    merged[header] = readString(primary[header]) || readString(secondary[header])
  }

  merged.Email = readString(existing.Email) || readString(candidate.Email)
  merged.Community =
    existing.Community === COMMUNITY_ACCEPTED_LABEL || candidate.Community === COMMUNITY_ACCEPTED_LABEL
      ? COMMUNITY_ACCEPTED_LABEL
      : 'No'
  merged['Consent Accepted'] =
    existing['Consent Accepted'] === COMMUNITY_ACCEPTED_LABEL ||
    candidate['Consent Accepted'] === COMMUNITY_ACCEPTED_LABEL
      ? COMMUNITY_ACCEPTED_LABEL
      : 'No'

  const existingSource = readString(existing.Source)
  const candidateSource = readString(candidate.Source)
  const shouldUseCandidateSource =
    candidateSource === COMMUNITY_PROFILE_SOURCE ||
    !existingSource ||
    (candidateScore > existingScore && existingSource !== COMMUNITY_PROFILE_SOURCE)

  merged.Source = shouldUseCandidateSource ? candidateSource || existingSource : existingSource

  const existingDate = readString(existing['Date Subscribed'])
  const candidateDate = readString(candidate['Date Subscribed'])
  const shouldUseCandidateDate =
    !existingDate ||
    (candidateSource === COMMUNITY_PROFILE_SOURCE && existingSource !== COMMUNITY_PROFILE_SOURCE)

  merged['Date Subscribed'] = shouldUseCandidateDate ? candidateDate || existingDate : existingDate

  return merged
}

function escapeCsvField(value: unknown) {
  const text = readString(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const escapedText = text.replace(/"/g, '""')

  return /[",\n]/.test(escapedText) ? `"${escapedText}"` : escapedText
}

export function getCommunityCsvContacts(attendees: CommunityCsvAttendee[]) {
  const contactsByEmail = new Map<string, CommunityCsvContact>()

  for (const attendee of attendees) {
    if (!isCommunityAccepted(attendee.community_consent)) continue

    const email = normalizeEmail(attendee.email)

    if (!isValidEmail(email)) continue

    const fullName = buildFullName(attendee)
    const { firstName, lastName } = getFirstAndLastName(attendee)
    const hasLegalConsent = Boolean(
      attendee.terms_accepted ||
      (attendee.accepted_privacy && attendee.accepted_terms),
    )

    const contact: CommunityCsvContact = {
      'Community': COMMUNITY_ACCEPTED_LABEL,
      'Consent Accepted': hasLegalConsent ? COMMUNITY_ACCEPTED_LABEL : 'No',
      'Date Subscribed': getDateSubscribed(attendee),
      'Email': email,
      'First Name': firstName,
      'Full Name': fullName,
      'Instagram': readString(attendee.instagram_handle),
      'Last Name': lastName,
      'Occupation': readString(attendee.occupation) || readString(attendee.guest_type),
      'Phone': readString(attendee.phone),
      'Source': getCommunitySource(attendee),
      'Ticket Code': readString(attendee.access_code),
    }
    const existingContact = contactsByEmail.get(email)

    contactsByEmail.set(email, existingContact ? mergeCommunityCsvContact(existingContact, contact) : contact)
  }

  return Array.from(contactsByEmail.values())
}

export function buildCommunityCsv(attendees: CommunityCsvAttendee[]) {
  const contacts = getCommunityCsvContacts(attendees)
  const rows = [
    COMMUNITY_CSV_HEADERS.map(escapeCsvField).join(','),
    ...contacts.map((contact) => COMMUNITY_CSV_HEADERS.map((header) => escapeCsvField(contact[header])).join(',')),
  ]

  return {
    contactCount: contacts.length,
    csv: `${UTF8_BOM}${rows.join('\r\n')}`,
  }
}

export function buildCommunityCsvFileName(date = new Date(), scope = '') {
  const normalizedScope = readString(scope)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const scopePart = normalizedScope ? `-${normalizedScope}` : ''

  return `onda-comunidad${scopePart}-${formatLocalDatePart(date)}.csv`
}
