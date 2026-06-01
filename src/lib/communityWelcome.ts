export type CommunityFilter = 'all' | 'pending' | 'sent'

export type CommunityWelcomeRecord = {
  community_consent?: boolean | string | null
  community_welcome_sent?: boolean | string | null
}

export const COMMUNITY_WELCOME_UPDATED_EVENT = 'onda-community-welcome-updated'

export const communityFilterOptions: Array<{ label: string; value: CommunityFilter }> = [
  { label: 'Todos comunidad', value: 'all' },
  { label: 'Pendientes de bienvenida', value: 'pending' },
  { label: 'Ya enviados', value: 'sent' },
]

export const communityFilterFileLabels: Record<CommunityFilter, string> = {
  all: 'todos',
  pending: 'pendientes-bienvenida',
  sent: 'enviados',
}

export function readCommunityBoolean(value: unknown) {
  if (value === true) return true
  if (value === false || value == null) return false
  if (typeof value !== 'string') return false

  const normalized = value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  return ['accepted', 'aceptado', 'si', 'true', 'yes'].includes(normalized)
}

export function matchesCommunityFilter(record: CommunityWelcomeRecord, filter: CommunityFilter) {
  if (!readCommunityBoolean(record.community_consent)) return false

  const welcomeSent = readCommunityBoolean(record.community_welcome_sent)

  if (filter === 'pending') return !welcomeSent
  if (filter === 'sent') return welcomeSent
  return true
}
