import type { User } from '@supabase/supabase-js'
import { supabaseAdmin } from './supabaseAdminClient'

export type AdminMembership = {
  id: string
  user_id: string | null
  email: string | null
  is_active: boolean
}

const adminMembershipSelect = 'id, user_id, email, is_active'

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? ''
}

function isMissingUserIdColumn(error: unknown) {
  if (!error || typeof error !== 'object') return false

  const { code, message } = error as { code?: string; message?: string }
  return code === '42703' || Boolean(message?.toLowerCase().includes('user_id'))
}

export async function getActiveAdminMembership(user: User): Promise<AdminMembership | null> {
  const userIdResult = await supabaseAdmin
    .from('admin_users')
    .select(adminMembershipSelect)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (userIdResult.error && !isMissingUserIdColumn(userIdResult.error)) {
    throw userIdResult.error
  }

  if (userIdResult.data) return userIdResult.data as AdminMembership

  const email = normalizeEmail(user.email)
  if (!email) return null

  const emailResult = await supabaseAdmin
    .from('admin_users')
    .select(adminMembershipSelect)
    .eq('email', email)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (emailResult.error) throw emailResult.error

  const membership = emailResult.data as AdminMembership | null
  if (!membership || normalizeEmail(membership.email) !== email) return null

  return membership
}
