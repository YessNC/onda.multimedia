import { useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import CTAButton from '../shared/CTAButton'
import { useI18n } from '../../hooks/useI18n'
import { getActiveAdminMembership } from '../../lib/adminAuth'
import { supabaseAdmin } from '../../lib/supabaseAdminClient'

const adminPanelPath = '/admin/eventos'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'No pudimos validar permisos admin.'
}

export default function AdminLoginForm() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const statusMessage =
    searchParams.get('reason') === 'inactive'
      ? 'Sesion cerrada por inactividad.'
      : searchParams.get('unauthorized') === '1'
        ? 'Tu usuario no tiene acceso administrador activo.'
        : ''

  useEffect(() => {
    let isMounted = true

    async function redirectIfAdminSessionExists() {
      try {
        const {
          data: { user },
        } = await supabaseAdmin.auth.getUser()

        if (!isMounted || !user) return

        const membership = await getActiveAdminMembership(user)

        if (!isMounted) return

        if (membership) {
          navigate(adminPanelPath, { replace: true })
          return
        }

        await supabaseAdmin.auth.signOut()
      } catch (adminCheckError) {
        console.error(getErrorMessage(adminCheckError))
        await supabaseAdmin.auth.signOut()
      }
    }

    void redirectIfAdminSessionExists()

    return () => {
      isMounted = false
    }
  }, [navigate])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')

    if (!email.trim() || !password) {
      setErrorMessage('Ingresa email y password.')
      return
    }

    setIsLoading(true)

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      setErrorMessage('No pudimos iniciar sesion. Revisa el email y password.')
      setIsLoading(false)
      return
    }

    if (!data.user) {
      setErrorMessage('No pudimos iniciar sesion. Intenta nuevamente.')
      setIsLoading(false)
      return
    }

    let membership = null

    try {
      membership = await getActiveAdminMembership(data.user)
    } catch (membershipError) {
      await supabaseAdmin.auth.signOut()
      setErrorMessage(`No pudimos validar permisos admin. ${getErrorMessage(membershipError)}`)
      setIsLoading(false)
      return
    }

    if (!membership) {
      await supabaseAdmin.auth.signOut()
      setErrorMessage('Tu usuario no tiene acceso administrador activo.')
      setIsLoading(false)
      return
    }

    navigate(adminPanelPath, { replace: true })
  }

  return (
    <form
      className="glass-panel mx-auto grid max-w-md gap-4 rounded-lg p-6"
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-md bg-onda-purple/10 text-onda-purple dark:bg-onda-purple/20 dark:text-onda-lavender">
        <Lock className="h-5 w-5" aria-hidden="true" />
      </div>
      <label className="grid gap-2 text-sm font-semibold text-zinc-700 dark:text-onda-soft">
        {t('admin-form.email')}
        <input
          type="email"
          placeholder={t('admin-form.email-placeholder')}
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isLoading}
          className="h-12 rounded-md border border-onda-purple/20 bg-white/70 px-4 outline-none transition focus:border-onda-purple dark:bg-white/5"
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-zinc-700 dark:text-onda-soft">
        {t('admin-form.password')}
        <input
          type="password"
          placeholder={t('admin-form.password-placeholder')}
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isLoading}
          className="h-12 rounded-md border border-onda-purple/20 bg-white/70 px-4 outline-none transition focus:border-onda-purple dark:bg-white/5"
        />
      </label>
      {errorMessage ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-200">
          {errorMessage}
        </p>
      ) : null}
      {statusMessage ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-700 dark:text-amber-200">
          {statusMessage}
        </p>
      ) : null}
      <CTAButton type="submit" className="mt-2 w-full" disabled={isLoading}>
        {isLoading ? 'Entrando...' : t('admin-form.submit')}
      </CTAButton>
      <Link
        to="/admin/reset-password"
        className="text-center text-sm font-semibold text-onda-purple transition hover:text-onda-electric dark:text-onda-lavender"
      >
        ¿Olvidaste tu contraseña?
      </Link>
      <p className="text-xs leading-6 text-zinc-500 dark:text-onda-muted">
        {t('admin-form.disclaimer')}
      </p>
    </form>
  )
}
