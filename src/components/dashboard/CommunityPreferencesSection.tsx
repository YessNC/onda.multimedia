import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { CheckCircle2, Loader2, Mail, ShieldCheck, UserRound, Users, XCircle } from 'lucide-react'
import { useI18n } from '../../hooks/useI18n'
import {
  type CommunityPreferences,
  updateDashboardCommunityPreferences,
} from '../../lib/dashboard'
import { cn } from '../../lib/utils'

interface CommunityPreferencesSectionProps {
  fallbackEmail?: string
  preferences: CommunityPreferences | null
  onError: (message: string) => void
  onSuccess: (message: string) => void
  onUpdated: (preferences: CommunityPreferences) => void
}

function PreferenceRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
}) {
  return (
    <div className="min-w-0 rounded-md border border-onda-purple/10 bg-white/75 p-3 dark:border-onda-lavender/10 dark:bg-white/[0.04]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-onda-purple/10 text-onda-purple dark:bg-white/10 dark:text-onda-lavender">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500 dark:text-onda-muted">
            {label}
          </p>
          <div className="mt-1 break-words text-sm font-semibold text-zinc-950 dark:text-white">
            {value}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusPill({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex min-h-7 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-bold uppercase tracking-[0.08em]',
        active
          ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
          : 'border-zinc-400/30 bg-zinc-500/10 text-zinc-600 dark:text-zinc-200',
      )}
    >
      {active ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <XCircle className="h-3.5 w-3.5" aria-hidden="true" />}
      {label}
    </span>
  )
}

export default function CommunityPreferencesSection({
  fallbackEmail = '',
  preferences,
  onError,
  onSuccess,
  onUpdated,
}: CommunityPreferencesSectionProps) {
  const { language, t } = useI18n()
  const [termsChecked, setTermsChecked] = useState(false)
  const [communityChecked, setCommunityChecked] = useState(false)
  const [saving, setSaving] = useState(false)

  const termsAccepted = Boolean(preferences?.terms_accepted)
  const communityAccepted = Boolean(preferences?.community_consent)
  const email = preferences?.email || fallbackEmail || t('dashboard.community.notAvailable')
  const fullName = preferences?.full_name || t('dashboard.community.noProfileName')

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'es-CL', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [language],
  )

  useEffect(() => {
    setTermsChecked(Boolean(preferences?.terms_accepted))
    setCommunityChecked(Boolean(preferences?.community_consent))
  }, [preferences?.id, preferences?.terms_accepted, preferences?.community_consent])

  function formatPreferenceDate(value?: string | null) {
    if (!value) return t('dashboard.community.noDate')

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return value
    return dateFormatter.format(date)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (!preferences) {
      onError(t('dashboard.community.error'))
      return
    }

    if (communityChecked && !termsAccepted && !termsChecked) {
      onError(t('dashboard.community.termsRequired'))
      return
    }

    const shouldAcceptTerms = !termsAccepted && termsChecked
    const communityChanged = communityChecked !== communityAccepted

    if (!shouldAcceptTerms && !communityChanged) return

    setSaving(true)

    try {
      const nextPreferences = await updateDashboardCommunityPreferences({
        acceptTerms: shouldAcceptTerms,
        communityConsent: communityChanged ? communityChecked : undefined,
      })

      onUpdated(nextPreferences)
      onSuccess(t('dashboard.community.success'))
    } catch {
      onError(t('dashboard.community.error'))
    } finally {
      setSaving(false)
    }
  }

  const shouldAcceptTerms = !termsAccepted && termsChecked
  const communityChanged = communityChecked !== communityAccepted
  const hasChanges = shouldAcceptTerms || communityChanged
  const canSave =
    Boolean(preferences) &&
    hasChanges &&
    (!communityChecked || termsAccepted || termsChecked)

  return (
    <section className="mt-6">
      <div className="glass-panel rounded-lg bg-white/75 p-4 sm:p-6 dark:bg-onda-black/48">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-onda-lavender">
              {t('dashboard.community.eyebrow')}
            </p>
            <h2 className="mt-2 font-display text-xl font-bold uppercase tracking-[0.08em] text-zinc-950 dark:text-white">
              {t('dashboard.community.title')}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-onda-muted">
              {t('dashboard.community.description')}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusPill
              active={termsAccepted}
              label={termsAccepted ? t('dashboard.community.accepted') : t('dashboard.community.notAccepted')}
            />
            <StatusPill
              active={communityAccepted}
              label={communityAccepted ? t('dashboard.community.communityYes') : t('dashboard.community.communityNo')}
            />
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <PreferenceRow
            icon={<Mail className="h-4 w-4" aria-hidden="true" />}
            label={t('dashboard.community.email')}
            value={email}
          />
          <PreferenceRow
            icon={<UserRound className="h-4 w-4" aria-hidden="true" />}
            label={t('dashboard.community.profileName')}
            value={fullName}
          />
          <PreferenceRow
            icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
            label={t('dashboard.community.termsStatus')}
            value={
              <div className="space-y-1">
                <div>{termsAccepted ? t('dashboard.community.accepted') : t('dashboard.community.notAccepted')}</div>
                <div className="text-xs font-medium text-zinc-500 dark:text-onda-muted">
                  {formatPreferenceDate(preferences?.terms_accepted_at)}
                </div>
              </div>
            }
          />
          <PreferenceRow
            icon={<Users className="h-4 w-4" aria-hidden="true" />}
            label={t('dashboard.community.communityStatus')}
            value={
              <div className="space-y-1">
                <div>{communityAccepted ? t('dashboard.community.communityYes') : t('dashboard.community.communityNo')}</div>
                <div className="text-xs font-medium text-zinc-500 dark:text-onda-muted">
                  {formatPreferenceDate(
                    communityAccepted
                      ? preferences?.community_consent_at
                      : preferences?.community_consent_revoked_at,
                  )}
                </div>
              </div>
            }
          />
        </div>

        {!preferences ? (
          <div className="mt-5 rounded-md border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-700 dark:text-amber-100">
            {t('dashboard.community.unavailable')}
          </div>
        ) : (
          <form className="mt-5 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
            {!termsAccepted ? (
              <label className="flex cursor-pointer items-start gap-3 rounded-md border border-onda-purple/15 bg-white/70 p-4 text-sm leading-6 text-zinc-700 dark:border-onda-lavender/15 dark:bg-white/[0.04] dark:text-onda-soft">
                <input
                  type="checkbox"
                  checked={termsChecked}
                  onChange={(event) => setTermsChecked(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-onda-purple/40 text-onda-purple focus:ring-onda-purple"
                />
                <span>{t('dashboard.community.termsCheckbox')}</span>
              </label>
            ) : null}

            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-onda-purple/15 bg-white/70 p-4 text-sm leading-6 text-zinc-700 dark:border-onda-lavender/15 dark:bg-white/[0.04] dark:text-onda-soft">
              <input
                type="checkbox"
                checked={communityChecked}
                onChange={(event) => setCommunityChecked(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-onda-purple/40 text-onda-purple focus:ring-onda-purple"
              />
              <span>{t('dashboard.community.joinCheckbox')}</span>
            </label>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={!canSave || saving}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-onda-purple px-4 py-3 font-display text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:-translate-y-0.5 hover:bg-onda-lavender disabled:cursor-not-allowed disabled:opacity-50 sm:w-fit"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                {saving ? t('dashboard.community.saving') : t('dashboard.community.save')}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
