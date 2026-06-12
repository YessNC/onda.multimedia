import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { PasswordInput } from './PasswordInput'

function getLoginErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  return message || 'No pudimos iniciar sesion. Revisa tus datos e intenta nuevamente.'
}

function getSafeRedirectPath(redirect: string | null) {
  if (!redirect) return '/dashboard'
  if (!redirect.startsWith('/') || redirect.startsWith('//') || redirect.includes('\\')) return '/dashboard'

  return redirect
}

export function LoginForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const registered = searchParams.get('registered') === '1'
  const redirectPath = getSafeRedirectPath(searchParams.get('redirect'))

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await login(email.trim(), password)
      navigate(redirectPath, { replace: true })
    } catch (loginError) {
      setError(getLoginErrorMessage(loginError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-5">
      {registered ? (
        <div className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-200">
          Registro recibido. Si activaste confirmacion por email, confirma tu cuenta antes de iniciar sesion.
        </div>
      ) : null}

      <div>
        <label className="mb-2 block text-sm font-semibold">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-md border border-onda-purple/20 bg-white px-4 py-3 outline-none transition focus:border-onda-purple focus:ring-2 focus:ring-onda-purple/40 dark:bg-white/10"
          placeholder="hola@correo.cl"
          autoComplete="email"
        />
      </div>

      <PasswordInput
        name="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        label="Contrasena"
        placeholder="********"
        autoComplete="current-password"
        required
      />

      {error ? (
        <div className="rounded-md bg-red-100 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-gradient-to-r from-onda-purple to-onda-electric px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Iniciando sesion...' : 'Iniciar sesion'}
      </button>
    </form>
  )
}
