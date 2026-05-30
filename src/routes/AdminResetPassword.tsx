import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CTAButton from '../components/shared/CTAButton'
import SectionTitle from '../components/shared/SectionTitle'
import { supabase } from '../lib/supabaseClient'

const resetEmailMessage =
  'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.'

function hasRecoveryParams() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const searchParams = new URLSearchParams(window.location.search)

  return (
    hashParams.get('type') === 'recovery' ||
    searchParams.get('type') === 'recovery' ||
    hashParams.has('access_token') ||
    searchParams.has('code')
  )
}

export default function AdminResetPassword() {
  const navigate = useNavigate()
  const [isRecoveryMode, setIsRecoveryMode] = useState(() => hasRecoveryParams())
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true)
      }
    })

    supabase.auth.getSession().then(({ data }) => {
      if (data.session && hasRecoveryParams()) {
        setIsRecoveryMode(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleResetEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setStatusMessage('')

    if (!email.trim()) {
      setErrorMessage('Ingresa tu email.')
      return
    }

    setIsLoading(true)

    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/admin/reset-password`,
    })

    setIsLoading(false)
    setStatusMessage(resetEmailMessage)
  }

  async function handleNewPasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setStatusMessage('')

    if (newPassword.length < 6) {
      setErrorMessage('La nueva contraseña debe tener al menos 6 caracteres.')
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.')
      return
    }

    setIsLoading(true)

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setErrorMessage('No pudimos actualizar la contraseña. Abre nuevamente el enlace del correo.')
      setIsLoading(false)
      return
    }

    await supabase.auth.signOut()
    navigate('/admin/login', { replace: true })
  }

  return (
    <section className="py-20">
      <div className="onda-container">
        <SectionTitle
          align="center"
          eyebrow="Admin"
          title="Restablecer contraseña"
          subtitle={
            isRecoveryMode
              ? 'Crea una nueva contraseña para tu acceso administrador.'
              : 'Recibe un enlace seguro para continuar con el cambio de contraseña.'
          }
        />
        <div className="mt-10">
          {isRecoveryMode ? (
            <form
              className="glass-panel mx-auto grid max-w-md gap-4 rounded-lg p-6"
              onSubmit={handleNewPasswordSubmit}
              noValidate
            >
              <label className="grid gap-2 text-sm font-semibold text-zinc-700 dark:text-onda-soft">
                Nueva contraseña
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  disabled={isLoading}
                  className="h-12 rounded-md border border-onda-purple/20 bg-white/70 px-4 outline-none transition focus:border-onda-purple dark:bg-white/5"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-zinc-700 dark:text-onda-soft">
                Confirmar contraseña
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  disabled={isLoading}
                  className="h-12 rounded-md border border-onda-purple/20 bg-white/70 px-4 outline-none transition focus:border-onda-purple dark:bg-white/5"
                />
              </label>
              {errorMessage ? (
                <p className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-200">
                  {errorMessage}
                </p>
              ) : null}
              <CTAButton type="submit" className="mt-2 w-full" disabled={isLoading}>
                {isLoading ? 'Actualizando...' : 'Actualizar contraseña'}
              </CTAButton>
            </form>
          ) : (
            <form
              className="glass-panel mx-auto grid max-w-md gap-4 rounded-lg p-6"
              onSubmit={handleResetEmailSubmit}
              noValidate
            >
              <label className="grid gap-2 text-sm font-semibold text-zinc-700 dark:text-onda-soft">
                Email
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
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
                <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-200">
                  {statusMessage}
                </p>
              ) : null}
              <CTAButton type="submit" className="mt-2 w-full" disabled={isLoading}>
                {isLoading ? 'Enviando...' : 'Enviar enlace'}
              </CTAButton>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
