import { Lock } from 'lucide-react'
import CTAButton from '../shared/CTAButton'
import { useI18n } from '../../hooks/useI18n'

export default function AdminLoginForm() {
  const { t } = useI18n()

  return (
    <form
      className="glass-panel mx-auto grid max-w-md gap-4 rounded-lg p-6"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-md bg-onda-purple/10 text-onda-purple dark:bg-onda-purple/20 dark:text-onda-lavender">
        <Lock className="h-5 w-5" aria-hidden="true" />
      </div>
      <label className="grid gap-2 text-sm font-semibold text-zinc-700 dark:text-onda-soft">
        {t('admin-form.email')}
        <input
          type="email"
          placeholder={t('admin-form.email-placeholder')}
          className="h-12 rounded-md border border-onda-purple/20 bg-white/70 px-4 outline-none transition focus:border-onda-purple dark:bg-white/5"
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-zinc-700 dark:text-onda-soft">
        {t('admin-form.password')}
        <input
          type="password"
          placeholder={t('admin-form.password-placeholder')}
          className="h-12 rounded-md border border-onda-purple/20 bg-white/70 px-4 outline-none transition focus:border-onda-purple dark:bg-white/5"
        />
      </label>
      <CTAButton type="submit" className="mt-2 w-full">
        {t('admin-form.submit')}
      </CTAButton>
      <p className="text-xs leading-6 text-zinc-500 dark:text-onda-muted">
        {t('admin-form.disclaimer')}
      </p>
    </form>
  )
}
